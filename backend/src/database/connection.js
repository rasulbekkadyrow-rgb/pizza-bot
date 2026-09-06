'use strict';

const { Pool } = require('pg');
const config = require('../config/default');
const logger = require('../utils/logger');

/**
 * PostgreSQL (Neon) ulanish qatlami.
 * Bitta global Pool — serverless pooler bilan ishlashga moslangan.
 */

/**
 * MUHIM (kechikish): baza `us-east-2` da, O'zbekistondan RTT ~150ms,
 * yangi TLS ulanish esa ~2.5s. Agar pool bo'sh ulanishlarni yopib yuborsa,
 * har bir "portlash" qayta ulanish narxini to'laydi va bot qotgandek tuyuladi.
 * Shuning uchun: ulanishlar YOPILMAYDI (idleTimeout 0) va TCP keepAlive yoqilgan.
 */
const pool = new Pool({
  connectionString: config.db.url,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMillis, // 0 = hech qachon yopilmasin
  connectionTimeoutMillis: config.db.connectionTimeoutMillis,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  // Neon `?sslmode=require` talab qiladi; sertifikat zanjirini rad etmaslik uchun:
  ssl: { rejectUnauthorized: false },
  application_name: 'pizza-tma-backend',
});

pool.on('error', (err) => {
  /**
   * Neon bo'sh ulanishni server tomonidan uzib qo'yishi mumkin
   * ("Connection terminated unexpectedly"). Bu KUTILGAN holat:
   * `pg` buzilgan clientni pooldan o'zi chiqarib tashlaydi, keyingi
   * so'rov yangi ulanish oladi. Shuning uchun bu xato jarayonni
   * yiqitmaydi va ERROR sifatida shovqin qilmaydi.
   */
  const isIdleDisconnect = /terminated unexpectedly|Connection terminated/i.test(err?.message || '');
  if (isIdleDisconnect) {
    logger.debug('PG: bo‘sh ulanish uzildi, pool uni almashtiradi');
  } else {
    logger.error('PG pool: kutilmagan xato', err);
  }
});

/**
 * Heartbeat — har 45 soniyada yengil `SELECT 1`.
 *
 * Ikki vazifa:
 *  1) Neon computeni "uyg'oq" tutadi (bo'sh turgach u to'xtaydi va
 *     keyingi so'rov ~2.5s sovuq start to'laydi);
 *  2) uzilgan ulanishlar FON'da almashtiriladi — foydalanuvchi
 *     so'rovi hech qachon qayta ulanishni kutmaydi.
 */
let heartbeatTimer = null;

function startHeartbeat(intervalMs = 45_000) {
  if (heartbeatTimer) return;

  heartbeatTimer = setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      logger.warn('Heartbeat muvaffaqiyatsiz', { message: err.message });
    }
  }, intervalMs);

  heartbeatTimer.unref(); // jarayonning yopilishiga to'sqinlik qilmasin
  logger.info('DB heartbeat yoqildi', { everyMs: intervalMs });
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

/**
 * Parametrli so'rov. SQL injection'dan himoya uchun HAR DOIM $1, $2 ishlating.
 * @param {string} text
 * @param {Array<any>} [params]
 */
async function query(text, params = []) {
  const startedAt = process.hrtime.bigint();
  try {
    const result = await pool.query(text, params);
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (ms > 300) {
      logger.warn('Sekin SQL query', { ms: Math.round(ms), sql: text.slice(0, 120) });
    }
    return result;
  } catch (err) {
    logger.error('SQL xatosi', { sql: text.slice(0, 200), code: err.code, message: err.message });
    throw err;
  }
}

/** Bitta qator qaytaradi (yoki null). */
async function one(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0] || null;
}

/** Qatorlar massivi. */
async function many(text, params = []) {
  const { rows } = await query(text, params);
  return rows;
}

/**
 * Tranzaksiya helper'i. Callback ichida `client.query(...)` ishlatiladi.
 * Xato bo'lsa — avtomatik ROLLBACK.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('ROLLBACK bajarilmadi', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Start paytida bazaga ulanishni tekshirish. */
async function healthCheck() {
  const row = await one('SELECT NOW() AS now, current_database() AS db');
  logger.info('PostgreSQL ulandi', { db: row.db, serverTime: row.now });
  return row;
}

/**
 * Ulanishlarni oldindan ochib qo'yish ("warm pool").
 * Birinchi foydalanuvchi TLS qo'l berishini kutib o'tirmasligi uchun.
 */
async function warmUp(connections = 3) {
  const clients = [];
  try {
    for (let i = 0; i < connections; i += 1) {
      clients.push(await pool.connect());
    }
    await Promise.all(clients.map((c) => c.query('SELECT 1')));
    logger.info('Ulanishlar isitildi', { connections: clients.length });
  } catch (err) {
    logger.warn('Ulanishlarni isitib bo‘lmadi', { message: err.message });
  } finally {
    // release() — ulanish poolda ochiq qoladi (idleTimeout 0 tufayli yopilmaydi)
    clients.forEach((c) => c.release());
  }
}

async function close() {
  await pool.end();
  logger.info('PG pool yopildi');
}

module.exports = {
  pool,
  query,
  one,
  many,
  transaction,
  healthCheck,
  warmUp,
  startHeartbeat,
  stopHeartbeat,
  close,
};
