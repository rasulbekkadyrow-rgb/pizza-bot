'use strict';

const config = require('../config/default');
const User = require('./User');
const logger = require('../utils/logger').child({ module: 'admin' });

/**
 * Adminlar reyestri.
 *
 * Ishchi ro'yxat ikki manbadan hosil bo'ladi:
 *   1) `.env` → ADMIN_CHAT_IDS   (o'zgarmas, "bootstrap")
 *   2) baza    → users.is_admin  (ish jarayonida qo'shiladi/olib tashlanadi)
 *
 * Ro'yxat har bir buyurtmada kerak bo'lgani uchun qisqa muddatli keshda
 * saqlanadi; huquq o'zgarganda kesh darhol bekor qilinadi.
 */

const CACHE_TTL_MS = 15_000;

let cache = { ids: null, expiresAt: 0 };

function invalidate() {
  cache = { ids: null, expiresAt: 0 };
}

/**
 * Barcha admin chat ID'lari (env + baza), dublikatsiz.
 * @returns {Promise<number[]>}
 */
async function getChatIds() {
  if (cache.ids && Date.now() < cache.expiresAt) return cache.ids;

  let fromDb = [];
  try {
    fromDb = (await User.findAdmins()).map((u) => u.telegramId);
  } catch (err) {
    // Baza vaqtincha javob bermasa ham env'dagi adminlar ishlashda davom etadi.
    logger.error('Adminlarni bazadan o‘qib bo‘lmadi', err);
  }

  const ids = [...new Set([...config.telegram.adminChatIds, ...fromDb])].filter(Number.isFinite);
  cache = { ids, expiresAt: Date.now() + CACHE_TTL_MS };
  return ids;
}

/** Berilgan Telegram ID admin ekanligini tekshiradi. */
async function isAdmin(telegramId) {
  if (!Number.isFinite(Number(telegramId))) return false;
  const ids = await getChatIds();
  return ids.includes(Number(telegramId));
}

/**
 * `/admin <kod>` orqali o'zini admin qilib tayinlash.
 * @returns {Promise<{ok:boolean, reason?:string, user?:object}>}
 */
async function enrollWithCode(tgUser, code) {
  if (!config.admin.canSelfEnroll) {
    return { ok: false, reason: 'DISABLED' };
  }
  if (String(code || '').trim() !== config.admin.setupCode) {
    logger.warn('Admin kodi noto‘g‘ri kiritildi', { telegramId: tgUser.id });
    return { ok: false, reason: 'BAD_CODE' };
  }

  if (await isAdmin(tgUser.id)) {
    return { ok: false, reason: 'ALREADY_ADMIN' };
  }

  // Profil ma'lumotlari to'liq saqlanishi uchun avval upsert, keyin huquq.
  await User.upsertFromTelegram(tgUser);
  const user = await User.setAdmin(tgUser.id, true);
  invalidate();

  logger.info('Yangi admin tayinlandi', { telegramId: tgUser.id, username: tgUser.username });
  return { ok: true, user };
}

/** Boshqa foydalanuvchiga admin huquqini berish (mavjud admin tomonidan). */
async function grant(telegramId) {
  const user = await User.setAdmin(Number(telegramId), true);
  invalidate();
  logger.info('Admin huquqi berildi', { telegramId });
  return user;
}

/**
 * Admin huquqini olib tashlash.
 * `.env` dagi adminlarni olib tashlab bo'lmaydi — ular himoyalangan.
 */
async function revoke(telegramId) {
  const id = Number(telegramId);

  if (config.telegram.adminChatIds.includes(id)) {
    return { ok: false, reason: 'ENV_PROTECTED' };
  }

  const user = await User.setAdmin(id, false);
  invalidate();
  logger.info('Admin huquqi olib tashlandi', { telegramId: id });
  return { ok: true, user };
}

/** Ro'yxat: kim env'dan, kim bazadan kelganini ko'rsatadi. */
async function list() {
  const fromDb = await User.findAdmins();
  const envIds = config.telegram.adminChatIds;

  const merged = new Map();

  for (const id of envIds) {
    merged.set(id, { telegramId: id, fullName: '—', username: null, source: 'env' });
  }
  for (const user of fromDb) {
    merged.set(user.telegramId, {
      telegramId: user.telegramId,
      fullName: user.fullName || '—',
      username: user.username,
      source: envIds.includes(user.telegramId) ? 'env+db' : 'db',
    });
  }

  return [...merged.values()];
}

module.exports = { getChatIds, isAdmin, enrollWithCode, grant, revoke, list, invalidate };
