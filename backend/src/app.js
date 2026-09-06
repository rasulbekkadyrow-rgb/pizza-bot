'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const config = require('./config/default');
const logger = require('./utils/logger');
const db = require('./database/connection');
const botCore = require('./core/bot');
const { registerBotHandlers } = require('./routes/bot.routes');
const apiRoutes = require('./routes/api.routes');

/**
 * Express ilovasi — SERVERGA BOG'LIQ EMAS.
 *
 * Nima uchun `index.js` dan ajratildi: bu bir xil ilova ikki xil muhitda ishlaydi —
 *   • lokal/VPS  → `index.js` uni `app.listen()` bilan ko'taradi, bot long polling'da
 *   • Vercel     → `api/index.js` uni serverless funksiya sifatida eksport qiladi,
 *                  bot esa webhook orqali ishlaydi (doimiy jarayon yo'q)
 */

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());

  // ── Telegram webhook ───────────────────────────────────────
  // MUHIM: `express.json()` DAN OLDIN turishi kerak — Telegraf tanani
  // o'zi o'qiydi. Aks holda update ikki marta parse qilinadi.
  registerBotHandlers(botCore.bot);
  app.use(botCore.bot.webhookCallback(config.telegram.webhookPath));

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    cors({
      origin(origin, callback) {
        // Telegram WebView ba'zan Origin yubormaydi — bunday so'rovlarga ruxsat.
        if (!origin) return callback(null, true);
        if (config.cors.origins.includes('*') || config.cors.origins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS: ${origin} ruxsat etilmagan`));
      },
      credentials: false,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
    })
  );

  // ── Health check ─────────────────────────────────────────────
  app.get('/health', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({
        ok: true,
        uptime: Math.round(process.uptime()),
        env: config.env,
        runtime: config.isServerless ? 'serverless' : 'server',
      });
    } catch {
      res
        .status(503)
        .json({ ok: false, error: { code: 'DB_DOWN', message: 'Baza javob bermayapti' } });
    }
  });

  // ── API ──────────────────────────────────────────────────────
  app.use('/api', apiRoutes);

  // ── 404 ──────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint topilmadi' } });
  });

  // ── Markaziy xato ishlovchisi ────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error('So‘rovda kutilmagan xato', {
      path: req.originalUrl,
      method: req.method,
      message: err.message,
      stack: config.isProd ? undefined : err.stack,
    });

    if (String(err.message).startsWith('CORS:')) {
      return res
        .status(403)
        .json({ ok: false, error: { code: 'CORS_BLOCKED', message: err.message } });
    }

    res.status(err.status || 500).json({
      ok: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: config.isProd ? 'Serverda xatolik yuz berdi' : err.message,
      },
    });
  });

  return app;
}

module.exports = { createApp };
