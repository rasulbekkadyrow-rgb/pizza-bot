'use strict';

/**
 * LOKAL / VPS uchun kirish nuqtasi.
 *
 * Bu yerda bot **long polling** rejimida ishlaydi va jarayon doimiy turadi.
 * Vercel (serverless) uchun kirish nuqtasi boshqa: `api/index.js`.
 */

const config = require('./config/default');
config.assertConfig();

const logger = require('./utils/logger');
const db = require('./database/connection');
const botCore = require('./core/bot');
const { createApp } = require('./app');

const app = createApp();

async function bootstrap() {
  await db.healthCheck();

  // Kechikishga qarshi: ulanishlarni va katalog keshini oldindan tayyorlaymiz.
  // Busiz birinchi foydalanuvchi ~2.5s TLS + 3 ta so'rovni kutardi.
  const Product = require('./models/Product');
  await Promise.all([
    db.warmUp(3),
    Product.warmCatalog().catch((err) =>
      logger.warn('Katalog keshini to‘ldirib bo‘lmadi', { message: err.message })
    ),
  ]);

  // Neon computeni uyg'oq tutadi va uzilgan ulanishlarni fonda almashtiradi
  db.startHeartbeat();

  // Telegram sozlamalari + long polling (yoki PUBLIC_URL bo'lsa — webhook)
  await botCore.launch();

  const server = app.listen(config.port, () => {
    logger.info('HTTP server ishga tushdi', {
      port: config.port,
      env: config.env,
      cors: config.cors.origins,
    });
  });

  // Adminlar aniqlanganini boot paytida ko'rsatamiz
  const Admin = require('./models/Admin');
  const adminIds = await Admin.getChatIds();

  if (adminIds.length) {
    logger.info('Adminlar aniqlandi', { count: adminIds.length, ids: adminIds });
  } else {
    logger.warn(
      'DIQQAT: admin yo‘q — buyurtmalar hech kimga yuborilmaydi. ' +
        'Botga `/admin <ADMIN_SETUP_CODE>` yozing yoki ID ni ADMIN_CHAT_IDS ga qo‘shing.'
    );
  }

  // ── Graceful shutdown ──────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} qabul qilindi — to‘xtatilmoqda...`);
    botCore.stop(signal);
    db.stopHeartbeat();
    server.close(async () => {
      await db.close().catch(() => {});
      logger.info('Xayr! 👋');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error('Ishga tushirib bo‘lmadi', err);
  process.exit(1);
});
