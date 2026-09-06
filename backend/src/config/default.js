'use strict';

require('dotenv').config();

/**
 * Markazlashgan konfiguratsiya.
 * Barcha env o'qish SHU faylda bo'ladi — qolgan modullar faqat shu obyektni import qiladi.
 */

const bool = (v, def = false) =>
  v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const int = (v, def) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const list = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Serverless muhit (Vercel) — doimiy jarayon YO'Q.
 * Bunda heartbeat, warm-up va long polling ishlatilmaydi,
 * ulanishlar pooli esa kichik bo'ladi.
 */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  isServerless,
  port: int(process.env.PORT, 4000),

  cors: {
    origins: list(process.env.CORS_ORIGINS).length
      ? list(process.env.CORS_ORIGINS)
      : ['http://localhost:3000'],
  },

  telegram: {
    token: process.env.BOT_TOKEN,
    webAppUrl: process.env.WEBAPP_URL || 'http://localhost:3000',
    /**
     * .env dagi doimiy adminlar — "bootstrap" ro'yxati.
     * Ishchi ro'yxat `models/Admin.js` da shu ro'yxat + bazadagi
     * `users.is_admin = true` foydalanuvchilar birlashmasidan hosil bo'ladi.
     */
    adminChatIds: list(process.env.ADMIN_CHAT_IDS).map(Number).filter(Number.isFinite),
    publicUrl: (process.env.PUBLIC_URL || '').replace(/\/+$/, ''),
    webhookSecret: process.env.WEBHOOK_SECRET || 'tg-webhook-secret',
    get useWebhook() {
      return Boolean(this.publicUrl);
    },
    get webhookPath() {
      return `/api/bot/webhook/${this.webhookSecret}`;
    },
  },

  db: {
    url: process.env.DATABASE_URL,
    // Serverless'da har bir instansiya o'z poolini ochadi — kam ulanish kerak.
    max: int(process.env.PG_POOL_MAX, isServerless ? 2 : 10),
    // Doimiy serverda ulanish yopilmaydi (0), serverless'da esa tez bo'shatiladi.
    idleTimeoutMillis: int(process.env.PG_IDLE_TIMEOUT, isServerless ? 10_000 : 0),
    connectionTimeoutMillis: int(process.env.PG_CONNECT_TIMEOUT, 10_000),
  },

  admin: {
    /** Bir martalik kod: botga `/admin <kod>` → admin huquqi beriladi. */
    setupCode: (process.env.ADMIN_SETUP_CODE || '').trim(),
    setupDisabled: bool(process.env.ADMIN_SETUP_DISABLED, false),
    get canSelfEnroll() {
      return !this.setupDisabled && this.setupCode.length >= 6;
    },
  },

  brand: {
    name: process.env.BRAND_NAME || 'Pizza Hub',
    supportUsername: (process.env.SUPPORT_USERNAME || '').replace(/^@/, ''),
    supportPhone: process.env.SUPPORT_PHONE || '',
    workHours: process.env.WORK_HOURS || '10:00 – 23:00',
    deliveryEtaMinutes: int(process.env.DELIVERY_ETA_MINUTES, 30),
  },

  /**
   * Pul birligi: O'zbekiston so'mi.
   * Barcha summalar BUTUN SONDA — so'mda (tiyin ishlatilmaydi), shuning uchun
   * 100 ga bo'lish yoki float arifmetikasi umuman yo'q.
   */
  business: {
    currency: process.env.CURRENCY || 'UZS',
    currencySymbol: process.env.CURRENCY_SYMBOL || "so'm",
    deliveryFee: int(process.env.DELIVERY_FEE, 15_000),
    freeDeliveryFrom: int(process.env.FREE_DELIVERY_FROM, 150_000),
    payment: {
      cardNumber: process.env.PAYMENT_CARD_NUMBER || '0000 0000 0000 0000',
      cardHolder: process.env.PAYMENT_CARD_HOLDER || 'PIZZA HUB',
      note: process.env.PAYMENT_NOTE || '',
    },
  },

  security: {
    // initData imzosining amal qilish muddati (soniya)
    initDataTtlSeconds: int(process.env.INIT_DATA_TTL, 86_400),
    devBypassAuth: bool(process.env.DEV_BYPASS_AUTH, false),
  },
};

/** Ishga tushishdan oldin kritik sozlamalarni tekshirish. */
function assertConfig() {
  const missing = [];
  if (!config.telegram.token) missing.push('BOT_TOKEN');
  if (!config.db.url) missing.push('DATABASE_URL');

  if (missing.length) {
    throw new Error(
      `Konfiguratsiya xatosi: .env faylda quyidagilar to'ldirilmagan → ${missing.join(', ')}`
    );
  }
  return config;
}

module.exports = config;
module.exports.assertConfig = assertConfig;
