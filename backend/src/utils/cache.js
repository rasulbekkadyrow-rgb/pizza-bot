'use strict';

const logger = require('./logger').child({ module: 'cache' });

/**
 * Oddiy TTL kesh (xotirada).
 *
 * Nima uchun kerak: baza Neon'ning `us-east-2` mintaqasida, O'zbekistondan
 * har bir so'rov ~150ms, sovuq ulanish esa ~2.5s turadi. Katalog kuniga bir
 * marta o'zgaradi — uni har so'rovda bazadan olish behuda kutish demak.
 *
 * `stale-while-revalidate`: muddati tugagan qiymat DARHOL qaytariladi va
 * fonda yangilanadi — foydalanuvchi hech qachon kutmaydi.
 */

const store = new Map();

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} loader
 * @param {number} ttlMs
 * @returns {Promise<T>}
 */
async function remember(key, loader, ttlMs = 60_000) {
  const entry = store.get(key);
  const now = Date.now();

  // 1) Yangi qiymat bor — darhol qaytaramiz
  if (entry && now < entry.expiresAt) return entry.value;

  // 2) Eskirgan, lekin bor — qaytaramiz va fonda yangilaymiz
  if (entry && !entry.refreshing) {
    entry.refreshing = true;
    void loader()
      .then((value) => store.set(key, { value, expiresAt: Date.now() + ttlMs, refreshing: false }))
      .catch((err) => {
        entry.refreshing = false;
        logger.warn('Keshni fonda yangilab bo‘lmadi', { key, message: err.message });
      });
    return entry.value;
  }

  // 3) Umuman yo'q — kutamiz
  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs, refreshing: false });
  return value;
}

/** Bitta kalitni yoki butun keshni tozalash. */
function invalidate(key) {
  if (key) store.delete(key);
  else store.clear();
  logger.debug('Kesh tozalandi', { key: key || '*' });
}

/** Boot paytida oldindan to'ldirish — birinchi foydalanuvchi kutmasligi uchun. */
async function warm(key, loader, ttlMs = 60_000) {
  try {
    const value = await loader();
    store.set(key, { value, expiresAt: Date.now() + ttlMs, refreshing: false });
    return true;
  } catch (err) {
    logger.warn('Keshni oldindan to‘ldirib bo‘lmadi', { key, message: err.message });
    return false;
  }
}

module.exports = { remember, invalidate, warm };
