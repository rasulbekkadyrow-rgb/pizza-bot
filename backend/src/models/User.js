'use strict';

const db = require('../database/connection');
const config = require('../config/default');

/**
 * User modeli — Telegram foydalanuvchisi bilan ishlash.
 * Barcha metodlar "plain object" qaytaradi (DTO), ORM sinfi emas.
 */

const SELECT_FIELDS = `
  id, telegram_id, first_name, last_name, username, photo_url,
  language_code, phone, is_admin, is_blocked, created_at, updated_at
`;

/** @param {any} row */
function toDTO(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    telegramId: Number(row.telegram_id),
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    languageCode: row.language_code,
    phone: row.phone,
    isAdmin: row.is_admin,
    isBlocked: row.is_blocked,
    fullName: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
    createdAt: row.created_at,
  };
}

/**
 * Telegram profilidan foydalanuvchini yaratadi yoki yangilaydi.
 * @param {{id:number, first_name?:string, last_name?:string, username?:string, photo_url?:string, language_code?:string}} tgUser
 */
async function upsertFromTelegram(tgUser) {
  const isAdmin = config.telegram.adminChatIds.includes(Number(tgUser.id));

  const row = await db.one(
    `INSERT INTO users (telegram_id, first_name, last_name, username, photo_url, language_code, is_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (telegram_id) DO UPDATE SET
       first_name    = EXCLUDED.first_name,
       last_name     = EXCLUDED.last_name,
       username      = EXCLUDED.username,
       photo_url     = COALESCE(EXCLUDED.photo_url, users.photo_url),
       language_code = EXCLUDED.language_code,
       is_admin      = users.is_admin OR EXCLUDED.is_admin
     RETURNING ${SELECT_FIELDS}`,
    [
      tgUser.id,
      tgUser.first_name || '',
      tgUser.last_name || null,
      tgUser.username || null,
      tgUser.photo_url || null,
      tgUser.language_code || 'uz',
      isAdmin,
    ]
  );

  return toDTO(row);
}

async function findByTelegramId(telegramId) {
  const row = await db.one(
    `SELECT ${SELECT_FIELDS} FROM users WHERE telegram_id = $1`,
    [telegramId]
  );
  return toDTO(row);
}

async function findById(id) {
  const row = await db.one(`SELECT ${SELECT_FIELDS} FROM users WHERE id = $1`, [id]);
  return toDTO(row);
}

async function setPhone(telegramId, phone) {
  const row = await db.one(
    `UPDATE users SET phone = $2 WHERE telegram_id = $1 RETURNING ${SELECT_FIELDS}`,
    [telegramId, phone]
  );
  return toDTO(row);
}

/**
 * Admin huquqini berish/olib tashlash.
 * Foydalanuvchi hali bazada bo'lmasa (botga /start bosmagan bo'lsa) —
 * minimal yozuv yaratiladi, keyin /start da profili to'ldiriladi.
 */
async function setAdmin(telegramId, isAdmin) {
  const row = await db.one(
    `INSERT INTO users (telegram_id, first_name, is_admin)
     VALUES ($1, '', $2)
     ON CONFLICT (telegram_id) DO UPDATE SET is_admin = EXCLUDED.is_admin
     RETURNING ${SELECT_FIELDS}`,
    [telegramId, isAdmin]
  );
  return toDTO(row);
}

/** Bazadagi barcha adminlar. */
async function findAdmins() {
  const rows = await db.many(
    `SELECT ${SELECT_FIELDS} FROM users WHERE is_admin ORDER BY created_at`
  );
  return rows.map(toDTO);
}

/** Foydalanuvchi statistikasi — profil sahifasi uchun. */
async function getStats(userId) {
  const row = await db.one(
    `SELECT
       COUNT(*)::int                                                      AS orders_count,
       COALESCE(SUM(total_amount) FILTER (WHERE status <> 'CANCELLED'), 0)::int AS spent
     FROM orders WHERE user_id = $1`,
    [userId]
  );
  return { ordersCount: row.orders_count, spent: row.spent };
}

module.exports = {
  toDTO,
  upsertFromTelegram,
  findByTelegramId,
  findById,
  setPhone,
  setAdmin,
  findAdmins,
  getStats,
};
