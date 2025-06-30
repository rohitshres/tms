const qrcode = require('qrcode-terminal');
const fs = require('fs');
const readline = require('readline');
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

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('WhatsApp is ready!');
    const filePath = 'group_messages.txt';

    if (fs.existsSync(filePath)) {
        const groupId = '120363402373814473@g.us'; // Replace with your actual group ID
        const groupId2 = '120363418931905115@g.us';

        const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity
        });

        let buffer = '';
        for await (const line of rl) {
            if (line.trim() === '') {
                if (buffer.trim().length > 0) {
                    try {
                        await client.sendMessage(groupId, buffer.trim());
                        await client.sendMessage(groupId2, buffer.trim());
                        console.log('Sent message:', buffer.trim());
                    } catch (err) {
                        console.error('Failed to send message:', err.message);
                    }
                }
                buffer = '';
            } else {
                buffer += line + '\n';
            }
        }
        // Send any remaining message in buffer
        if (buffer.trim().length > 0) {
            try {
                await client.sendMessage(groupId, buffer.trim());
                await client.sendMessage(groupId2, buffer.trim());
                console.log('Sent message:', buffer.trim());
            } catch (err) {
                console.error('Failed to send message:', err.message);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 30000));
        fs.unlinkSync(filePath);
        console.log('group_messages.txt deleted after sending.');
    } else {
        console.log('group_messages.txt does not exist. No message sent.');
    }
    console.log('client destroyed');
    await client.destroy();
    process.exit(0);
});

client.initialize();