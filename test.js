const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { Client } = require('whatsapp-web.js');

const client = new Client({
    puppeteer: { handleSIGINT: true }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('WhatsApp is ready!');

    const chats = await client.getChats();
    chats.forEach(chat => {
        if (chat.isGroup) {
            console.log(`Group Name: ${chat.name}, Group ID: ${chat.id._serialized}`);
        }
    });
});

client.initialize();