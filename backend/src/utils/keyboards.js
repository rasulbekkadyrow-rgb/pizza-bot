'use strict';

const { Markup } = require('telegraf');
const config = require('../config/default');

/**
 * Barcha klaviaturalar shu yerda — controller'larda UI kodi aralashmasligi uchun.
 *
 * Callback data formati:  `<domain>:<action>:<id>`   (max 64 bayt!)
 *   order:confirm:12   → adminning "Tasdiqlash & To'lov linkini yuborish" tugmasi
 *   order:paid:12      → "To'lov keldi" (PAID → PREPARING)
 *   order:deliver:12   → "Yo'lga chiqdi"
 *   order:done:12      → "Yetkazildi"
 *   order:cancel:12    → "Bekor qilish"
 */

const CB = {
  confirm: (id) => `order:confirm:${id}`,
  paid: (id) => `order:paid:${id}`,
  deliver: (id) => `order:deliver:${id}`,
  done: (id) => `order:done:${id}`,
  cancel: (id) => `order:cancel:${id}`,
};

/** Callback data'ni ajratish. */
function parseCallback(data) {
  const [domain, action, rawId] = String(data || '').split(':');
  return { domain, action, id: Number(rawId) };
}

/**
 * Telegram `web_app` tugmasini faqat HTTPS manzil bilan qabul qiladi.
 * HTTP (lokal dev) bo'lsa — tugmani qo'shsak, Telegram BUTUN xabarni
 * 400 xatosi bilan rad etadi va foydalanuvchi hech narsa olmaydi.
 * Shuning uchun har bir joyda shu tekshiruv ishlatiladi.
 */
function canOpenWebApp() {
  return /^https:\/\//i.test(config.telegram.webAppUrl || '');
}

/**
 * /start — Mini App'ni ochuvchi asosiy tugma.
 * Adminlar uchun qo'shimcha qator: «👑 Admin panel».
 */
function mainMenu(isAdmin = false) {
  const rows = [
    [
      canOpenWebApp()
        ? Markup.button.webApp('🍕 Buyurtma berish', config.telegram.webAppUrl)
        : '🍕 Buyurtma berish',
    ],
    ['📋 Mening buyurtmalarim', '📞 Aloqa'],
  ];

  if (isAdmin) rows.push(['👑 Admin panel']);

  return Markup.keyboard(rows).resize();
}

/**
 * Xabar ichidagi inline "Mini App'ni ochish" tugmasi.
 * HTTPS bo'lmasa — bo'sh obyekt qaytaradi (xabar tugmasiz, lekin YETIB BORADI).
 */
function openAppInline(label = '🍕 Menyuni ochish') {
  if (!canOpenWebApp()) return {};
  return Markup.inlineKeyboard([[Markup.button.webApp(label, config.telegram.webAppUrl)]]);
}

/** Telefon raqamni so'rash. */
function requestPhone() {
  return Markup.keyboard([[Markup.button.contactRequest('📱 Raqamni yuborish')]])
    .resize()
    .oneTime();
}

/**
 * Admin uchun buyurtma kartochkasi tugmalari — statusga qarab o'zgaradi.
 * @param {string} status
 * @param {number} orderId
 */
function adminOrderKeyboard(status, orderId) {
  const rows = [];

  switch (status) {
    case 'PENDING':
      rows.push([Markup.button.callback('✅ Tasdiqlash & To‘lov linkini yuborish 💳', CB.confirm(orderId))]);
      rows.push([Markup.button.callback('❌ Bekor qilish', CB.cancel(orderId))]);
      break;
    case 'CONFIRMED':
      rows.push([Markup.button.callback('💰 To‘lov keldi → Tayyorlashga', CB.paid(orderId))]);
      rows.push([Markup.button.callback('❌ Bekor qilish', CB.cancel(orderId))]);
      break;
    case 'PAID':
    case 'PREPARING':
      rows.push([Markup.button.callback('🛵 Yo‘lga chiqdi', CB.deliver(orderId))]);
      rows.push([Markup.button.callback('❌ Bekor qilish', CB.cancel(orderId))]);
      break;
    case 'DELIVERING':
      rows.push([Markup.button.callback('🎉 Yetkazildi', CB.done(orderId))]);
      break;
    default:
      // COMPLETED / CANCELLED — tugmalar kerak emas
      break;
  }

  return Markup.inlineKeyboard(rows);
}

/** Admin panel menyusi (inline). */
function adminPanelKeyboard() {
  const rows = [
    [Markup.button.callback('📋 Faol buyurtmalar', 'admin:pending')],
    [
      Markup.button.callback('📊 Statistika', 'admin:stats'),
      Markup.button.callback('👑 Adminlar', 'admin:admins'),
    ],
  ];

  if (canOpenWebApp()) {
    rows.push([Markup.button.webApp('🍕 Mini App', config.telegram.webAppUrl)]);
  }

  return Markup.inlineKeyboard(rows);
}

/** Mijozga yuboriladigan "to'lovni amalga oshirdim" tugmasi (ixtiyoriy oqim uchun). */
function customerPaymentKeyboard(orderId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📤 To‘lovni amalga oshirdim (chek yuboraman)', `order:receipt:${orderId}`)],
  ]);
}

module.exports = {
  CB,
  parseCallback,
  canOpenWebApp,
  mainMenu,
  openAppInline,
  requestPhone,
  adminOrderKeyboard,
  adminPanelKeyboard,
  customerPaymentKeyboard,
};
