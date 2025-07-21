const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

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

const sourceGroupId = '120363401226236955@g.us'; // Source group ID
const targetGroupId1= '120363402373814473@g.us'; // Target group ID
const targetGroupId2 = '120363418931905115@g.us'; // Target group 
const lastTimestampFile = 'wa_last_message_timestamp.txt';

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('WhatsApp is ready!');

    let lastTimestamp = 0;
    if (fs.existsSync(lastTimestampFile)) {
        try {
            lastTimestamp = parseInt(fs.readFileSync(lastTimestampFile, 'utf8').trim(), 10) || 0;
        } catch {
            lastTimestamp = 0;
        }
    }

    const chat = await client.getChatById(sourceGroupId);
    const messages = await chat.fetchMessages({ limit: 50 }); // Fetch last 50 messages

    // Filter and sort messages in ascending order by timestamp
    const newMessages = messages
        .filter(msg => msg.timestamp > lastTimestamp)
        .sort((a, b) => a.timestamp - b.timestamp);

    let newLastTimestamp = lastTimestamp;
    let messagesForwarded = 0;

    for (const msg of newMessages) {
        try {
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                if (media) {
                    await client.sendMessage(targetGroupId1, media, { caption: msg.body || '' });
                    await client.sendMessage(targetGroupId2, media, { caption: msg.body || '' });
                }
            } else if (msg.body && msg.body.trim() !== '') {
                await client.sendMessage(targetGroupId1, msg.body);
                await client.sendMessage(targetGroupId2, msg.body);
            }
            if (msg.timestamp > newLastTimestamp) newLastTimestamp = msg.timestamp;
            messagesForwarded++;
            //wait for a short time to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1200));
        } catch (err) {
            console.error('Failed to forward message:', err.message);
        }
    }

    if (newLastTimestamp > lastTimestamp) {
        fs.writeFileSync(lastTimestampFile, newLastTimestamp.toString());
    }

    console.log(`${messagesForwarded} new messages forwarded to target group.`);
    await client.destroy();
    process.exit(0);
});

client.initialize();