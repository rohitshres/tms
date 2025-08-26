const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const mediaDir = path.join(__dirname, 'media');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const dbFile = path.join(__dirname, 'messages.sqlite');
const db = new sqlite3.Database(dbFile);

// create table
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            timestamp INTEGER,
            author TEXT,
            body TEXT,
            hasMedia INTEGER DEFAULT 0,
            mediaPath TEXT,
            isSent INTEGER DEFAULT 0
        )
    `);
});

// small helpers to use sqlite with async/await
const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (err) { if (err) rej(err); else res(this); }));
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));
const get = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row)));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGINT: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// CONFIG - set your source and target group IDs
const sourceGroupId = '120363401226236955@g.us';
const targetGroups = [
    '120363420416221456@g.us',
    '120363404154781450@g.us'
];

client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', async () => {
  
    console.log('WhatsApp ready — storing unread messages to SQLite and forwarding unsent ones.');

    try {
        // 1) Fetch recent messages from source group and store to SQLite (avoid duplicates)
        const chat = await client.getChatById(sourceGroupId);
        const fetched = await chat.fetchMessages({ limit: 100 }); // adjust limit as needed
        // ensure oldest-first
        fetched.sort((a, b) => a.timestamp - b.timestamp);

        for (const msg of fetched) {
            // normalize message id
            const msgId = (msg.id && (msg.id.id || msg.id._serialized)) ? (msg.id.id || msg.id._serialized) : String(msg.id);
            // skip if already in DB
            const exists = await get('SELECT 1 FROM messages WHERE id = ?', [msgId]);
            if (exists) continue;

            let hasMedia = msg.hasMedia ? 1 : 0;
            let mediaPath = null;

            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media && media.data) {
                        // build extension from mimetype if possible
                        let ext = '';
                        if (media.mimetype) {
                            const parts = media.mimetype.split('/');
                            ext = parts[1] ? ('.' + parts[1].split(';')[0]) : '';
                        }
                        const safeId = msgId.replace(/[^a-zA-Z0-9_-]/g, '');
                        const filename = `media_${safeId}_${msg.timestamp}${ext}`;
                        const filepath = path.join(mediaDir, filename);
                        fs.writeFileSync(filepath, media.data, { encoding: 'base64' });
                        mediaPath = filepath;
                    } else {
                        hasMedia = 0;
                    }
                } catch (err) {
                    console.warn('media download failed for', msgId, err.message);
                    hasMedia = 0;
                }
            }

            const author = msg.author || msg.from || '';
            const body = (msg.body || '').trim();
            if (!body) continue;
            await run(
                `INSERT INTO messages (id, timestamp, author, body, hasMedia, mediaPath, isSent) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                [msgId, msg.timestamp, author, body, hasMedia, mediaPath]
            );
        }

        // 2) Read unsent messages from DB in order and forward them
        const unsent = await all('SELECT * FROM messages WHERE isSent = 0 ORDER BY timestamp ASC');
        let forwarded = 0;

        for (const row of unsent) {
            try {
                if (row.hasMedia && row.mediaPath && fs.existsSync(row.mediaPath)) {
                    const media = MessageMedia.fromFilePath(row.mediaPath);
                    for (const gid of targetGroups) {
                        await client.sendMessage(gid, media, { caption: row.body || '' });
                        await new Promise(r => setTimeout(r, 800)); // small delay between sends
                    }
                } else if (row.body && row.body.trim() !== '') {
                    for (const gid of targetGroups) {
                        await client.sendMessage(gid, row.body);
                        await new Promise(r => setTimeout(r, 500));
                    }
                } else {
                    // nothing to forward, mark as sent to avoid repeated attempts
                }

                // mark as sent
                await run('UPDATE messages SET isSent = 1 WHERE id = ?', [row.id]);
                forwarded++;
                // avoid rate limits
                await new Promise(r => setTimeout(r, 1200));
            } catch (err) {
                console.error('Failed to forward message', row.id, err.message);
                // do not mark as sent so it can be retried later
            }
        }

        console.log(`Forwarded ${forwarded} messages.`);

    } catch (err) {
        console.error('Error in processing:', err.message);
    } finally {
        // cleanup
        try { await client.destroy(); } catch {}
        db.close();
        process.exit(0);
    }
});

client.initialize();