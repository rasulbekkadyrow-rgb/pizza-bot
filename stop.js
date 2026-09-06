'use strict';

/**
 * Hamma narsani to'xtatadi: backend, frontend va tunnel.
 * Ishlatish: npm stop
 */

const { execSync } = require('node:child_process');

const PORTS = [3000, 4000];

function killByPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const pids = [...new Set(out.trim().split('\n').map((l) => l.trim().split(/\s+/).pop()))];

    for (const pid of pids.filter(Boolean)) {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
      console.log(`  ✓ ${port}-port bo‘shatildi (PID ${pid})`);
    }
    return pids.length;
  } catch {
    return 0;
  }
}

function killTunnel() {
  try {
    execSync('taskkill /IM cloudflared.exe /F', { stdio: 'ignore' });
    console.log('  ✓ Tunnel yopildi');
    return true;
  } catch {
    return false;
  }
}

console.log('Pizza Hub to‘xtatilmoqda...');

let stopped = 0;
for (const port of PORTS) stopped += killByPort(port);
if (killTunnel()) stopped += 1;

console.log(
  stopped ? '✅ To‘xtatildi. Server endi tashqaridan ochiq emas.' : 'ℹ️ Ishlab turgan jarayon topilmadi.'
);
