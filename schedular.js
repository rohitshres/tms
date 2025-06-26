const { exec } = require('child_process');

function runScripts() {
    console.log(`[${new Date().toLocaleString()}] Running telegram.py...`);
    exec('python telegram.py', (err, stdout, stderr) => {
        if (err) {
            console.error(`Error running telegram.py: ${stderr}`);
            return;
        }
        console.log(stdout);

        console.log(`[${new Date().toLocaleString()}] Running whatapp.js...`);
        exec('node whatapp.js', (err2, stdout2, stderr2) => {
            if (err2) {
                console.error(`Error running whatapp.js: ${stderr2}`);
                return;
            }
            console.log(stdout2);
        });
    });
}

// Run immediately, then every 5 minutes (300000 ms)
runScripts();
setInterval(runScripts, 5 * 60 * 1000);