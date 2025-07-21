const { exec } = require('child_process');

const intervalSeconds = 5 * 60; // 5 minutes

function runScript() {
    console.log(`\n[${new Date().toLocaleString()}] Running whatappread.js...`);
    exec('node whatappread.js', (err, stdout, stderr) => {
        if (err) {
            console.error(`Error running whatappread.js: ${stderr}`);
            return;
        }
        console.log(stdout);
    });
}

// Run immediately, then every 5 minutes (300000 ms)
runScript();
setInterval(runScript, intervalSeconds * 1000);