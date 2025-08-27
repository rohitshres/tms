const { spawn } = require('child_process');
const path = require('path');

const intervalSeconds = 5 * 60; // 5 minutes
const scripts = [
  'whatappread.js',
  'whatappknowledge.js'
];

let isRunning = false;
let lastStart = 0;
const maxRunSeconds = 10 * 60; // if previous run > 10 minutes, consider it stuck and reset

function runNodeScript(script, maxMs = 5 * 60 * 1000) {
    return new Promise((resolve, reject) => {
        const proc = spawn(process.execPath, [path.join(__dirname, script)], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const start = Date.now();
        let killedByTimeout = false;

        const timeout = setTimeout(() => {
            killedByTimeout = true;
            try { proc.kill('SIGTERM'); } catch (e) {}
            setTimeout(() => { try { proc.kill('SIGKILL'); } catch (e) {} }, 2000);
        }, maxMs);

        proc.stdout.on('data', d => process.stdout.write(d));
        proc.stderr.on('data', d => process.stderr.write(d));

        proc.on('error', err => {
            clearTimeout(timeout);
            reject(err);
        });

        proc.on('close', code => {
            clearTimeout(timeout);
            if (killedByTimeout) {
                reject(new Error(`${script} killed after timeout (${maxMs}ms)`));
            } else if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${script} exited with code ${code}`));
            }
        });
    });
}

async function runScriptChain() {
    const now = Date.now();
    if (isRunning) {
        if (now - lastStart > maxRunSeconds * 1000) {
            console.warn('Previous run exceeded maxRunSeconds — resetting and continuing.');
            isRunning = false;
        } else {
            console.log('Previous run still in progress — skipping this cycle.');
            return;
        }
    }

    isRunning = true;
    lastStart = Date.now();
    console.log(`[${new Date().toISOString()}] Scheduler starting script chain.`);

    try {
        for (const s of scripts) {
            console.log(`Starting ${s}...`);
            await runNodeScript(s, 4 * 60 * 1000); // per-script timeout: 4 minutes
            console.log(`${s} finished.`);
        }
    } catch (err) {
        console.error('Scheduler error:', err.message);
    } finally {
        isRunning = false;
        console.log(`[${new Date().toISOString()}] Scheduler run complete.`);
    }
}

// Run immediately, then schedule
runScriptChain();
setInterval(runScriptChain, intervalSeconds * 1000);