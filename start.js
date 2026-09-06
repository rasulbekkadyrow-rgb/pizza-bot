'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 *  PIZZA HUB — yagona ishga tushirgich
 * ═══════════════════════════════════════════════════════════════
 *
 * Kompyuter yoqilganda hammasini o'zi ko'taradi:
 *
 *   1) Cloudflare tunnelini ochadi va yangi HTTPS manzilni oladi
 *   2) Manzilni backend/.env ga yozadi (WEBAPP_URL)
 *   3) Backend'ni ishga tushiradi — u yuklanayotganda Telegram'dagi
 *      menyu tugmasini yangi manzilga o'zi qayta bog'laydi
 *   4) Frontend'ni ishga tushiradi
 *   5) Biror jarayon yiqilsa — qayta ko'taradi
 *
 * Tunnel manzili har safar yangi bo'ladi, lekin bu muammo emas:
 * ilova API'ni SHU domen ostidan chaqiradi (Next rewrites), botning
 * menyu tugmasi esa har ishga tushishda yangilanadi.
 *
 * Qo'lda ishga tushirish:  npm start
 * To'xtatish:              npm stop   (yoki shu oynada Ctrl+C)
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const LOGS = path.join(ROOT, 'logs');
const STATE_FILE = path.join(LOGS, 'current-url.txt');

const IS_WINDOWS = process.platform === 'win32';
const children = new Map();
let shuttingDown = false;

fs.mkdirSync(LOGS, { recursive: true });

// ── Log ────────────────────────────────────────────────────────
const mainLog = fs.createWriteStream(path.join(LOGS, 'start.log'), { flags: 'a' });

function log(message) {
  const line = `[${new Date().toLocaleString('uz-UZ')}] ${message}`;
  console.log(line);
  mainLog.write(line + '\n');
}

// ── Jarayonni nazorat ostida ishga tushirish ───────────────────

/**
 * Bolani ishga tushiradi va yiqilsa qayta ko'taradi.
 * @param {string} name
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function supervise(name, command, args, cwd) {
  if (shuttingDown) return;

  const out = fs.createWriteStream(path.join(LOGS, `${name}.log`), { flags: 'a' });
  const child = spawn(command, args, {
    cwd,
    shell: IS_WINDOWS, // Windows'da .cmd (npm/next) shell orqali chaqiriladi
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  child.stdout.pipe(out);
  child.stderr.pipe(out);
  children.set(name, child);

  log(`▶ ${name} ishga tushdi (PID ${child.pid})`);

  child.on('exit', (code) => {
    children.delete(name);
    if (shuttingDown) return;

    log(`✖ ${name} to‘xtadi (kod ${code}) — 5 soniyadan keyin qayta ko‘tariladi`);
    setTimeout(() => supervise(name, command, args, cwd), 5000);
  });

  child.on('error', (err) => log(`✖ ${name} xatosi: ${err.message}`));
  return child;
}

// ── Cloudflare tunneli ─────────────────────────────────────────

/** cloudflared binarysini topadi (kerak bo'lsa yuklab oladi). */
async function resolveCloudflared() {
  const { bin, install } = require('cloudflared');
  if (!fs.existsSync(bin)) {
    log('cloudflared yuklab olinmoqda (faqat bir marta)...');
    await install(bin);
  }
  return bin;
}

/**
 * Tunnelni ochadi va HTTPS manzilni qaytaradi.
 * Manzil cloudflared'ning chiqishida `https://xxx.trycloudflare.com` ko'rinishida keladi.
 */
function openTunnel(bin, port) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(path.join(LOGS, 'tunnel.log'), { flags: 'a' });
    const child = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`], {
      windowsHide: true,
    });

    children.set('tunnel', child);

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Tunnel 90 soniyada ochilmadi'));
      }
    }, 90_000);

    const scan = (chunk) => {
      const text = chunk.toString();
      out.write(text);

      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve(match[0]);
      }
    };

    child.stdout.on('data', scan);
    child.stderr.on('data', scan);

    child.on('exit', (code) => {
      children.delete('tunnel');
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`cloudflared to‘xtadi (kod ${code})`));
      } else if (!shuttingDown) {
        // Tunnel uzilib qolsa — butun tizimni qayta ishga tushirish kerak,
        // chunki yangi manzil olinadi.
        log('✖ Tunnel uzildi — 10 soniyadan keyin qaytadan boshlanadi');
        setTimeout(() => bootstrap().catch((e) => log(`✖ ${e.message}`)), 10_000);
      }
    });
  });
}

// ── .env yangilash ─────────────────────────────────────────────

/** Fayldagi `KEY=...` qatorini yangi qiymat bilan almashtiradi. */
function setEnvValue(file, key, value) {
  const content = fs.readFileSync(file, 'utf8');
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  const next = pattern.test(content) ? content.replace(pattern, line) : `${content}\n${line}\n`;
  fs.writeFileSync(file, next);
}

// ── Asosiy oqim ────────────────────────────────────────────────

async function bootstrap() {
  // Avvalgi urinishdan qolgan jarayonlarni to'xtatamiz
  for (const [name, child] of children) {
    child.kill();
    children.delete(name);
  }

  log('═══ Pizza Hub ishga tushmoqda ═══');

  const bin = await resolveCloudflared();
  log('Tunnel ochilmoqda...');
  const url = await openTunnel(bin, 3000);
  log(`🌍 Manzil: ${url}`);

  // Backend shu manzilni bilishi kerak: menyu tugmasi va Mini App havolasi uchun
  const envFile = path.join(BACKEND, '.env');
  setEnvValue(envFile, 'WEBAPP_URL', url);
  setEnvValue(envFile, 'CORS_ORIGINS', `${url},http://localhost:3000`);
  fs.writeFileSync(STATE_FILE, `${url}\n${new Date().toISOString()}\n`);

  // Backend .env ni START paytida o'qiydi — shuning uchun manzil yozilgandan keyin
  supervise('backend', 'node', ['src/index.js'], BACKEND);

  // Frontend — ishlab chiqarish rejimi (tez va barqaror).
  // `npm run build` faqat kod o'zgarganda kerak, har safar emas.
  supervise('frontend', 'npm', ['run', 'start'], FRONTEND);

  log('✅ Hammasi ishga tushdi. Telegram: @rk_pizza_bot → /start');
}

// ── To'xtatish ─────────────────────────────────────────────────

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log(`${signal} — to‘xtatilmoqda...`);
  for (const [name, child] of children) {
    log(`  ↳ ${name} yopilmoqda`);
    child.kill();
  }
  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap().catch((err) => {
  log(`✖ Ishga tushirib bo‘lmadi: ${err.message}`);
  log('  60 soniyadan keyin qayta urinamiz (internet hali ulanmagan bo‘lishi mumkin)');
  setTimeout(() => bootstrap().catch((e) => log(`✖ ${e.message}`)), 60_000);
});
