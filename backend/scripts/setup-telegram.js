'use strict';

/**
 * Deploy'dan KEYIN bir marta ishga tushiriladi:
 *
 *   npm run telegram:setup
 *
 * Telegram tomonidagi hamma narsani sozlaydi:
 *   • buyruqlar menyusi (oddiy + admin)
 *   • ko'k «Menyu» tugmasi → Mini App
 *   • start bosilishidan oldingi tavsif
 *   • webhook manzili (PUBLIC_URL berilgan bo'lsa)
 *
 * Serverless'da (Vercel) doimiy jarayon yo'q, shuning uchun bu sozlamalar
 * avtomatik emas — deploy'dan keyin qo'lda bir marta chaqiriladi.
 *
 * Kerakli o'zgaruvchilar:
 *   BOT_TOKEN, WEBAPP_URL  (frontend manzili)
 *   PUBLIC_URL             (backend manzili — webhook uchun)
 */

require('dotenv').config();

const config = require('../src/config/default');
config.assertConfig();

const botCore = require('../src/core/bot');
const db = require('../src/database/connection');
const logger = require('../src/utils/logger');

async function main() {
  logger.info('Telegram sozlanmoqda...', {
    webAppUrl: config.telegram.webAppUrl,
    publicUrl: config.telegram.publicUrl || '(yo‘q)',
  });

  if (!/^https:\/\//i.test(config.telegram.webAppUrl)) {
    logger.warn(
      'WEBAPP_URL HTTPS emas — Mini App tugmasi ishlamaydi. ' +
        'Frontend deploy manzilini WEBAPP_URL ga yozing.'
    );
  }

  await botCore.configureTelegram();

  if (config.telegram.publicUrl) {
    await botCore.registerWebhook();
  } else {
    logger.warn(
      'PUBLIC_URL bo‘sh — webhook o‘rnatilmadi. ' +
        'Backend deploy manzilini PUBLIC_URL ga yozing (masalan https://pizza-api.vercel.app).'
    );
  }

  const info = await botCore.bot.telegram.getWebhookInfo();
  logger.info('Webhook holati', {
    url: info.url || '(o‘rnatilmagan)',
    pending: info.pending_update_count,
    lastError: info.last_error_message || null,
  });

  await db.close().catch(() => {});
  logger.info('✅ Telegram sozlandi');
}

main().catch(async (err) => {
  logger.error('Sozlab bo‘lmadi', err);
  await db.close().catch(() => {});
  process.exit(1);
});
