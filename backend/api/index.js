'use strict';

/**
 * VERCEL (serverless) uchun kirish nuqtasi.
 *
 * Vercel bu faylni serverless funksiya sifatida chaqiradi va Express
 * ilovasining o'zi `(req, res)` ishlovchisi bo'lgani uchun uni to'g'ridan-to'g'ri
 * eksport qilamiz — `app.listen()` chaqirilmaydi.
 *
 * Farqlari (doimiy serverdan):
 *   • Bot LONG POLLING'da emas, WEBHOOK'da ishlaydi
 *     (`/api/bot/webhook/<WEBHOOK_SECRET>` manzili `app.js` da ulangan)
 *   • Heartbeat va warm-up yo'q — doimiy jarayon bo'lmagani uchun ma'nosiz
 *   • Telegram sozlamalari (buyruqlar, menyu tugmasi, webhook) deploy'dan keyin
 *     bir marta `npm run telegram:setup` orqali o'rnatiladi
 */

const config = require('../src/config/default');
config.assertConfig();

const { createApp } = require('../src/app');

module.exports = createApp();
