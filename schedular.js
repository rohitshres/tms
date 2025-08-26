const { spawn } = require('child_process');
const path = require('path');

const intervalSeconds = 5 * 60; // 5 minutes
const scripts = [
  'whatappread.js',
  'whatappknowledge.js' // keep or remove depending on whether you want this run
];

let isRunning = false;

function runNodeScript(script) {
    return new Promise((resolve, reject) => {
        const proc = spawn(process.execPath, [path.join(__dirname, script)], { stdio: ['ignore', 'pipe', 'pipe'] });

        proc.stdout.on('data', d => process.stdout.write(d));
        proc.stderr.on('data', d => process.stderr.write(d));

        proc.on('error', err => reject(err));
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`${script} exited with code ${code}`));
        });
    });
}

async function runScriptChain() {
    if (isRunning) {
        console.log('Previous run still in progress — skipping this cycle.');
        return;
    }
    isRunning = true;
    try {
        for (const s of scripts) {
            // skip empty or commented entries if you want to run only one script
            await runNodeScript(s);
        }
    } catch (err) {
        console.error('Scheduler error:', err.message);
    } finally {
        isRunning = false;
    }
}

// Run immediately, then schedule
runScriptChain();
setInterval(runScriptChain, intervalSeconds * 1000);