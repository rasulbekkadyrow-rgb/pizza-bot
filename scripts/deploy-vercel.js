'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 *  Vercel'ga to'liq avtomatik deploy
 * ═══════════════════════════════════════════════════════════════
 *
 *   npm run deploy
 *
 * Bosqichlar (hammasi avtomatik):
 *   1) Vercel'ga kirilganini tekshiradi
 *   2) Backend loyihasini yaratadi/bog'laydi va muhit o'zgaruvchilarini yozadi
 *   3) Backend'ni deploy qiladi → API manzilini oladi
 *   4) Frontend loyihasini yaratadi, BACKEND_URL ni beradi va deploy qiladi
 *   5) Backend'ga yakuniy manzillarni (WEBAPP_URL, PUBLIC_URL) yozib qayta deploy qiladi
 *   6) Telegram'ni sozlaydi: webhook, menyu tugmasi, tavsif
 *
 * Yagona shart — bir marta `npx vercel login`.
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

const API_PROJECT = process.env.VERCEL_API_PROJECT || 'pizza-api';
const APP_PROJECT = process.env.VERCEL_APP_PROJECT || 'pizza-app';

const VERCEL = ['--yes', 'vercel@latest'];

// ── Yordamchilar ───────────────────────────────────────────────

function step(n, text) {
  console.log(`\n\x1b[36m[${n}]\x1b[0m ${text}`);
}
const ok = (t) => console.log(`  \x1b[32m✓\x1b[0m ${t}`);
const warn = (t) => console.log(`  \x1b[33m!\x1b[0m ${t}`);

/**
 * `npx vercel ...` ni ishga tushiradi.
 * @param {string[]} args
 * @param {{cwd?:string, stdin?:string, quiet?:boolean}} [opts]
 * @returns {Promise<{code:number, out:string, err:string}>}
 */
function vercel(args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn('npx', [...VERCEL, ...args], {
      cwd: opts.cwd || ROOT,
      shell: process.platform === 'win32',
      env: process.env,
    });

    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));

    if (opts.stdin !== undefined) {
      child.stdin.write(opts.stdin);
      child.stdin.end();
    }

    child.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }));
  });
}

/** `.env` faylini kalit→qiymat obyektiga o'qiydi. */
function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const result = {};

  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const i = line.indexOf('=');
    if (i === -1) continue;

    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (value) result[key] = value;
  }
  return result;
}

/** Bitta muhit o'zgaruvchisini o'rnatadi (avval eskisini o'chiradi). */
async function setEnv(cwd, key, value) {
  await vercel(['env', 'rm', key, 'production', '--yes'], { cwd });
  const res = await vercel(['env', 'add', key, 'production'], { cwd, stdin: `${value}\n` });

  if (res.code !== 0) {
    warn(`${key} o‘rnatilmadi: ${res.err.split('\n')[0]}`);
    return false;
  }
  return true;
}

/** Deploy chiqishidan https manzilni ajratib oladi. */
function extractUrl(text) {
  const matches = text.match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi);
  return matches ? matches[matches.length - 1] : null;
}

// ── Asosiy oqim ────────────────────────────────────────────────

async function main() {
  console.log('\x1b[1m🍕 Pizza Hub → Vercel\x1b[0m');

  // ── 1. Kirish tekshiruvi ─────────────────────────────────────
  step(1, 'Vercel akkaunti tekshirilmoqda...');
  const who = await vercel(['whoami']);

  if (who.code !== 0) {
    console.error(
      '\n\x1b[31m✖ Vercel\'ga kirilmagan.\x1b[0m\n\n' +
        '  Bir marta shu buyruqni bajaring (brauzer ochiladi):\n\n' +
        '    npx vercel login\n\n' +
        '  Keyin yana `npm run deploy` deb yozing — qolgani avtomatik.\n'
    );
    process.exit(1);
  }
  ok(`Akkaunt: ${who.out.split('\n').pop()}`);

  // ── 2. Backend muhiti ────────────────────────────────────────
  const env = readEnv(path.join(BACKEND, '.env'));
  const required = ['BOT_TOKEN', 'DATABASE_URL', 'ADMIN_CHAT_IDS'];
  const missing = required.filter((k) => !env[k]);

  if (missing.length) {
    console.error(`\n✖ backend/.env da yetishmayapti: ${missing.join(', ')}`);
    process.exit(1);
  }

  step(2, `Backend loyihasi (${API_PROJECT}) tayyorlanmoqda...`);

  // Avval loyihani yaratamiz/bog'laymiz. `link` ba'zi CLI versiyalarida
  // mavjud bo'lmagan loyihani yarata olmaydi — shuning uchun muvaffaqiyatsizlik
  // halokatli emas: keyingi `deploy` loyihani baribir yaratadi.
  const linkApi = await vercel(['link', '--yes', '--project', API_PROJECT], { cwd: BACKEND });
  if (linkApi.code !== 0) {
    warn('Bog‘lab bo‘lmadi — loyiha birinchi deploy paytida yaratiladi');
    const first = await vercel(['deploy', '--yes'], { cwd: BACKEND });
    if (first.code !== 0) {
      console.error(`✖ Backend loyihasini yaratib bo‘lmadi:
${first.err || first.out}`);
      process.exit(1);
    }
  }
  ok('Loyiha tayyor');

  // Ishlab chiqarish uchun xavfsiz qiymatlar
  const backendEnv = {
    ...env,
    NODE_ENV: 'production',
    ADMIN_SETUP_DISABLED: 'true', // kod orqali admin bo'lish yopiladi
  };
  delete backendEnv.DEBUG_INIT_DATA; // xom initData log'ga yozilmasin
  delete backendEnv.PORT; // portni Vercel o'zi beradi

  step(3, 'Muhit o‘zgaruvchilari yozilmoqda (bu biroz vaqt oladi)...');
  for (const [key, value] of Object.entries(backendEnv)) {
    if (await setEnv(BACKEND, key, value)) process.stdout.write('.');
  }
  console.log('');
  ok(`${Object.keys(backendEnv).length} ta o‘zgaruvchi`);

  // ── 4. Backend deploy ────────────────────────────────────────
  step(4, 'Backend deploy qilinmoqda...');
  const apiDeploy = await vercel(['deploy', '--prod', '--yes'], { cwd: BACKEND });
  const apiUrl = extractUrl(apiDeploy.out + apiDeploy.err);

  if (!apiUrl) {
    console.error(`✖ Backend deploy bo‘lmadi:\n${apiDeploy.err || apiDeploy.out}`);
    process.exit(1);
  }
  ok(`API: ${apiUrl}`);

  // ── 5. Frontend ──────────────────────────────────────────────
  step(5, `Frontend loyihasi (${APP_PROJECT}) tayyorlanmoqda...`);
  const linkApp = await vercel(['link', '--yes', '--project', APP_PROJECT], { cwd: FRONTEND });
  if (linkApp.code !== 0) {
    warn('Bog‘lab bo‘lmadi — loyiha birinchi deploy paytida yaratiladi');
    const first = await vercel(['deploy', '--yes'], { cwd: FRONTEND });
    if (first.code !== 0) {
      console.error(`✖ Frontend loyihasini yaratib bo‘lmadi:
${first.err || first.out}`);
      process.exit(1);
    }
  }

  // BACKEND_URL build paytida o'qiladi (next.config.mjs → rewrites)
  await setEnv(FRONTEND, 'BACKEND_URL', apiUrl);
  await setEnv(FRONTEND, 'NEXT_PUBLIC_API_URL', '/api');
  await setEnv(FRONTEND, 'NEXT_PUBLIC_BRAND_NAME', env.BRAND_NAME || 'Pizza Hub');
  await setEnv(FRONTEND, 'NEXT_PUBLIC_SUPPORT_USERNAME', env.SUPPORT_USERNAME || '');
  ok('Muhit o‘zgaruvchilari yozildi');

  step(6, 'Frontend deploy qilinmoqda (build ~1-2 daqiqa)...');
  const appDeploy = await vercel(['deploy', '--prod', '--yes'], { cwd: FRONTEND });
  const appUrl = extractUrl(appDeploy.out + appDeploy.err);

  if (!appUrl) {
    console.error(`✖ Frontend deploy bo‘lmadi:\n${appDeploy.err || appDeploy.out}`);
    process.exit(1);
  }
  ok(`Mini App: ${appUrl}`);

  // ── 7. Manzillarni bog'lash va backend'ni qayta deploy ───────
  step(7, 'Manzillar bog‘lanmoqda va backend qayta deploy qilinmoqda...');
  await setEnv(BACKEND, 'WEBAPP_URL', appUrl);
  await setEnv(BACKEND, 'PUBLIC_URL', apiUrl);
  await setEnv(BACKEND, 'CORS_ORIGINS', appUrl);

  const apiRedeploy = await vercel(['deploy', '--prod', '--yes'], { cwd: BACKEND });
  const finalApiUrl = extractUrl(apiRedeploy.out + apiRedeploy.err) || apiUrl;
  ok('Backend yangilandi');

  // ── 8. Telegram ──────────────────────────────────────────────
  step(8, 'Telegram sozlanmoqda (webhook, menyu tugmasi, tavsif)...');
  await new Promise((resolve) => {
    const child = spawn('node', ['scripts/setup-telegram.js'], {
      cwd: BACKEND,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      env: { ...process.env, WEBAPP_URL: appUrl, PUBLIC_URL: finalApiUrl },
    });
    child.on('close', resolve);
  });

  // ── Yakun ────────────────────────────────────────────────────
  console.log('\n\x1b[32m\x1b[1m✅ Deploy tugadi!\x1b[0m\n');
  console.log(`  Mini App : ${appUrl}`);
  console.log(`  API      : ${finalApiUrl}`);
  console.log(`  Health   : ${finalApiUrl}/health\n`);
  console.log('  Endi Telegram\'da botga /start yozing.\n');
  console.log('  Lokal serverni o‘chirish (endi kerak emas):');
  console.log('    npm run autostart:off && npm stop\n');
}

main().catch((err) => {
  console.error('\n✖ Xato:', err.message);
  process.exit(1);
});
