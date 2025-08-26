const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
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

// Config
const sourceGroupId = '120363401226236955@g.us';
const targetGroups = [
    '120363402373814473@g.us',
    '120363418931905115@g.us'
];
const lastTimestampFile = 'wa_last_message_timestamp.txt';

// QR
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Ready event
client.on('ready', async () => {
    console.log('✅ WhatsApp is ready!');

    // Read last timestamp
    let lastTimestamp = 0;
    if (fs.existsSync(lastTimestampFile)) {
        try {
            lastTimestamp = parseInt(fs.readFileSync(lastTimestampFile, 'utf8').trim(), 10) || 0;
        } catch {
            console.warn('⚠ Could not parse last timestamp, starting fresh.');
        }
    }

    try {
        const chat = await client.getChatById(sourceGroupId);
        let newLastTimestamp = lastTimestamp;
        let messagesForwarded = 0;

        // Fetch messages
        const messages = await chat.fetchMessages({ limit: 10 });
        messages.sort((a, b) => a.timestamp - b.timestamp);

        for (const msg of messages) {
            if (msg.timestamp > lastTimestamp) {
                try {
                    if (msg.hasMedia) {
                        const media = await msg.downloadMedia();
                        if (media) {
                            for (const groupId of targetGroups) {
                                console.log(`Forwarding message to ${groupId}: ${msg.body}`);
                                //await client.sendMessage(groupId, media, { caption: msg.body || '' });
                                await delay(1000);
                            }
                        }
                    } else if (msg.body && msg.body.trim() !== '') {
                        for (const groupId of targetGroups) {
                            console.log(`Forwarding message to ${groupId}: ${msg.body}`);
                            //await client.sendMessage(groupId, msg.body);
                            await delay(1000);
                        }
                    }

                    if (msg.timestamp > newLastTimestamp) {
                        newLastTimestamp = msg.timestamp;
                    }
                    messagesForwarded++;
                } catch (err) {
                    console.error('❌ Failed to forward message:', err.message);
                }
            }
        }

        // Save timestamp
        if (newLastTimestamp > lastTimestamp) {
            fs.writeFileSync(lastTimestampFile, newLastTimestamp.toString());
        }

        console.log(`📨 ${messagesForwarded} new messages forwarded.`);
    } catch (err) {
        console.error('❌ Error fetching messages:', err.message);
    }

    await client.destroy();
    process.exit(0);
});

// Helper delay
function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

client.initialize();
