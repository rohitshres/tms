const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');

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

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('WhatsApp is ready!');
    const filePath = 'group_messages.txt';
    let message = '';

    if (fs.existsSync(filePath)) {
        try {
            message = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            console.error('Could not read group_messages.txt:', err.message);
            await client.destroy();
            process.exit(0);
        }

        const groupId = '120363402373814473@g.us'; // Replace with your actual group ID
        const groupId2 = '120363418931905115@g.us';

        // Split messages by double new line and send each non-empty message
        const messages = message.split('\r\n\r\n').map(m => m.trim()).filter(m => m.length > 0);

        for (const msg of messages) {
            try {
                await client.sendMessage(groupId, msg);
                await client.sendMessage(groupId2, msg);
                console.log('Sent message:', msg);
            } catch (err) {
                console.error('Failed to send message:', err.message);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 30000));
        fs.unlinkSync(filePath);
        // Optionally delete the file after sending
        console.log('group_messages.txt deleted after sending.');
    } else {
        console.log('group_messages.txt does not exist. No message sent.');
    }
    console.log('client destroyed');
    await client.destroy();
    process.exit(0);
});
client.initialize();

