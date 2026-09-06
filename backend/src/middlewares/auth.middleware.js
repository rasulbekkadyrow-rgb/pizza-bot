'use strict';

const crypto = require('node:crypto');
const config = require('../config/default');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * Telegram Mini App autentifikatsiyasi.
 *
 * Mini App har bir so'rovda `window.Telegram.WebApp.initData` ni yuboradi.
 * Uning imzosi HMAC-SHA256 orqali tekshiriladi:
 *
 *   secret_key   = HMAC_SHA256(key = "WebAppData", data = bot_token)
 *   check_string = "auth_date=...\nquery_id=...\nuser=..."  (hash'siz, kalitlar alifbo tartibida)
 *   hash         = HMAC_SHA256(key = secret_key, data = check_string)
 *
 * Bu imzosiz hech kim boshqa foydalanuvchi nomidan buyurtma bera olmaydi.
 */

class AuthError extends Error {
  constructor(message, code = 'UNAUTHORIZED', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

/** HMAC kaliti: secret = HMAC_SHA256(key = "WebAppData", data = bot_token) */
function secretKey() {
  return crypto.createHmac('sha256', 'WebAppData').update(config.telegram.token).digest();
}

function hmacHex(checkString) {
  return crypto.createHmac('sha256', secretKey()).update(checkString).digest('hex');
}

/**
 * Tekshirish uchun "check string"ning mumkin bo'lgan variantlari.
 *
 * Nima uchun bitta emas: Telegram spetsifikatsiyasi dekodlangan qiymatlarni
 * talab qiladi, lekin amalda oraliq proksilar (CDN, tunnel) qatorni qayta
 * kodlashi mumkin. Variantlarning HAR BIRI bot tokeni bilan HMAC orqali
 * tekshiriladi — ya'ni bu himoyani zaiflashtirmaydi, faqat transportdagi
 * farqlarga bardosh beradi.
 */
function buildCheckStringVariants(initData) {
  const variants = [];

  // 1) Standart: URLSearchParams orqali dekodlangan qiymatlar, kalit bo'yicha saralash
  const params = new URLSearchParams(initData);
  params.delete('hash');
  params.delete('signature');

  const decoded = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  variants.push(decoded.map(([k, v]) => `${k}=${v}`).join('\n'));

  // 2) Xom (percent-encoded) qiymatlar — qator o'zgarmagan holda
  const rawPairs = initData
    .split('&')
    .map((pair) => {
      const i = pair.indexOf('=');
      return i === -1 ? [pair, ''] : [pair.slice(0, i), pair.slice(i + 1)];
    })
    .filter(([k]) => k !== 'hash' && k !== 'signature')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  variants.push(rawPairs.map(([k, v]) => `${k}=${v}`).join('\n'));

  // 3) `signature` saqlangan holat (ba'zi eski implementatsiyalar uchun)
  const withSignature = [...new URLSearchParams(initData).entries()]
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  variants.push(withSignature.map(([k, v]) => `${k}=${v}`).join('\n'));

  return [...new Set(variants)];
}

/**
 * initData qatorini tekshiradi va ichidagi ma'lumotni qaytaradi.
 * @param {string} initData
 * @returns {{user: object, authDate: number, queryId?: string}}
 */
function verifyInitData(initData) {
  if (!initData || typeof initData !== 'string') {
    throw new AuthError('initData topilmadi', 'NO_INIT_DATA');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new AuthError('initData ichida hash yo‘q', 'NO_HASH');

  const expected = Buffer.from(hash, 'hex');
  const variants = buildCheckStringVariants(initData);

  const matched = variants.some((checkString) => {
    const computed = Buffer.from(hmacHex(checkString), 'hex');
    // Timing-safe taqqoslash
    return computed.length === expected.length && crypto.timingSafeEqual(computed, expected);
  });

  if (!matched) {
    // Diagnostika: sababni aniqlash uchun yetarli, lekin shaxsiy ma'lumotsiz
    logger.warn('initData imzosi mos kelmadi', {
      keys: [...params.keys()].sort().join(','),
      hashPrefix: hash.slice(0, 8),
      computedPrefix: hmacHex(variants[0]).slice(0, 8),
      hashLength: hash.length,
      length: initData.length,
      authDateAgeSec: Math.floor(Date.now() / 1000) - Number(params.get('auth_date') || 0),
      botIdFromToken: config.telegram.token.split(':')[0],
      variantsTried: variants.length,
    });

    // Chuqur tahlil uchun (faqat DEBUG_INIT_DATA=true bo'lganda va prod'da emas):
    // xom qatorni to'liq yozadi, shunda muammoni aynan takrorlash mumkin bo'ladi.
    if (process.env.DEBUG_INIT_DATA === 'true' && !config.isProd) {
      logger.warn('initData (xom, faqat debug uchun)', { raw: initData });
    }

    throw new AuthError('initData imzosi noto‘g‘ri', 'BAD_SIGNATURE', 403);
  }

  const authDate = Number(params.get('auth_date'));
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!Number.isFinite(authDate) || ageSeconds > config.security.initDataTtlSeconds) {
    throw new AuthError('initData muddati tugagan, ilovani qayta oching', 'EXPIRED', 401);
  }

  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    throw new AuthError('initData ichidagi user JSON buzilgan', 'BAD_USER');
  }
  if (!user?.id) throw new AuthError('Foydalanuvchi aniqlanmadi', 'NO_USER');

  return { user, authDate, queryId: params.get('query_id') || undefined };
}

/** So'rovdan initData'ni topish: header (afzal) yoki body. */
function extractInitData(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('tma ')) return header.slice(4).trim();
  if (req.get('x-telegram-init-data')) return req.get('x-telegram-init-data');
  if (req.body && typeof req.body._initData === 'string') return req.body._initData;
  return null;
}

/**
 * Express middleware: `req.tgUser` (xom Telegram profili) va `req.user` (DB DTO) ni to'ldiradi.
 */
async function authenticate(req, res, next) {
  try {
    // Faqat lokal ishlab chiqish uchun: DEV_BYPASS_AUTH=true bo'lsa test foydalanuvchi.
    if (config.security.devBypassAuth && !config.isProd) {
      const fake = { id: 111_111_111, first_name: 'Dev', last_name: 'Tester', username: 'dev_tester' };
      req.tgUser = fake;
      req.user = await User.upsertFromTelegram(fake);
      return next();
    }

    const initData = extractInitData(req);
    const { user: tgUser } = verifyInitData(initData);

    const user = await User.upsertFromTelegram(tgUser);
    if (user.isBlocked) throw new AuthError('Hisobingiz bloklangan', 'BLOCKED', 403);

    req.tgUser = tgUser;
    req.user = user;
    return next();
  } catch (err) {
    if (err instanceof AuthError) {
      logger.warn('Auth rad etildi', { code: err.code, ip: req.ip });
      return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    return next(err);
  }
}

/** Faqat adminlar uchun. */
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res
      .status(403)
      .json({ ok: false, error: { code: 'FORBIDDEN', message: 'Faqat administrator uchun' } });
  }
  return next();
}

module.exports = { authenticate, requireAdmin, verifyInitData, AuthError };
