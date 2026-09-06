'use strict';

const { Telegraf } = require('telegraf');
const config = require('../config/default');
const logger = require('../utils/logger').child({ module: 'bot' });

/**
 * Telegraf bot yadrosi.
 *
 * MUHIM: bu fayl HECH QANDAY controller'ni import qilmaydi — aylanma bog'liqlik
 * (circular dependency) bo'lmasligi uchun. Handler'lar `routes/bot.routes.js`
 * orqali `src/index.js` da ulanadi.
 */

const bot = new Telegraf(config.telegram.token, {
  handlerTimeout: 30_000,
});

/**
 * Telegram API xatolarini yumshoq qayta ishlash (bot yiqilmasligi kerak).
 *
 * DIQQAT: `ctx.updateType` ning O'ZI xato tashlashi mumkin — Telegram
 * biz bilmaydigan yangi turdagi update yuborsa, Telegraf uni aniqlay olmaydi.
 * Agar buni ushlamasak, xato ishlovchisining ichidagi xato jarayonni yiqitadi.
 */
bot.catch((err, ctx) => {
  let updateType = 'unknown';
  try {
    updateType = ctx?.updateType ?? 'unknown';
  } catch {
    /* noma'lum update turi — bu ham normal holat */
  }

  logger.error('Telegraf handler xatosi', {
    updateType,
    updateId: ctx?.update?.update_id,
    from: ctx?.from?.id,
    message: err?.message,
    stack: err?.stack,
  });
});

/**
 * Xabarni bitta chatga xavfsiz yuborish.
 * Foydalanuvchi botni bloklagan bo'lsa (403) — jarayonni to'xtatmaymiz.
 * @returns {Promise<import('telegraf/types').Message.TextMessage|null>}
 */
async function safeSend(chatId, text, extra = {}) {
  try {
    return await bot.telegram.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...extra,
    });
  } catch (err) {
    const code = err?.response?.error_code;
    if (code === 403) {
      logger.warn('Foydalanuvchi botni bloklagan', { chatId });
    } else {
      logger.error('sendMessage muvaffaqiyatsiz', { chatId, code, message: err?.message });
    }
    return null;
  }
}

/**
 * Barcha adminlarga yuborish.
 * Ro'yxat `models/Admin` dan olinadi: .env + bazadagi `is_admin` foydalanuvchilar.
 * @returns {Promise<Array<{chatId:number, messageId:number}>>}
 */
async function sendToAdmins(text, extra = {}) {
  // Lazy require — core/bot.js modul darajasida modellarga bog'lanmasligi uchun.
  const Admin = require('../models/Admin');
  const targets = await Admin.getChatIds();

  if (!targets.length) {
    logger.warn(
      'Admin topilmadi — buyurtma hech kimga yuborilmadi. ' +
        'Botga `/admin <ADMIN_SETUP_CODE>` yozib, o‘zingizni admin qiling.'
    );
    return [];
  }

  const results = await Promise.all(
    targets.map(async (chatId) => {
      const msg = await safeSend(chatId, text, extra);
      return msg ? { chatId, messageId: msg.message_id } : null;
    })
  );

  return results.filter(Boolean);
}

/** Mavjud xabarni tahrirlash (admin kartochkasini yangilash uchun). */
async function editMessage(chatId, messageId, text, extra = {}) {
  try {
    return await bot.telegram.editMessageText(chatId, messageId, undefined, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...extra,
    });
  } catch (err) {
    // "message is not modified" — bezarar
    if (!String(err?.message).includes('message is not modified')) {
      logger.warn('editMessageText muvaffaqiyatsiz', { chatId, messageId, message: err?.message });
    }
    return null;
  }
}

/** Lokatsiyani yuborish (yetkazib berish manzili uchun). */
async function sendLocation(chatId, latitude, longitude) {
  try {
    return await bot.telegram.sendLocation(chatId, latitude, longitude);
  } catch (err) {
    logger.warn('sendLocation muvaffaqiyatsiz', { chatId, message: err?.message });
    return null;
  }
}

/** Oddiy foydalanuvchi ko'radigan buyruqlar. */
const PUBLIC_COMMANDS = [
  { command: 'start', description: 'Botni ishga tushirish va menyuni ochish' },
  { command: 'menu', description: 'Pitssalar menyusi' },
  { command: 'orders', description: 'Mening buyurtmalarim' },
  { command: 'help', description: 'Yordam va aloqa' },
  { command: 'id', description: 'Mening Telegram ID raqamim' },
];

/** Faqat admin chatida ko'rinadigan qo'shimcha buyruqlar. */
const ADMIN_COMMANDS = [
  ...PUBLIC_COMMANDS,
  { command: 'panel', description: '👑 Admin panel' },
  { command: 'pending', description: '📋 Faol buyurtmalar' },
  { command: 'stats', description: '📊 Bugungi statistika' },
  { command: 'admins', description: '👥 Adminlar ro‘yxati' },
];

/** Bot buyruqlari menyusi (Telegram klientida "/" bosilganda ko'rinadi). */
async function setupCommands() {
  await bot.telegram.setMyCommands(PUBLIC_COMMANDS);
}

/**
 * Bot tavsifi — foydalanuvchi START ni BOSISHDAN OLDIN ko'radigan matn.
 *
 *  • description       — bo'sh chatda katta blok (max 512 belgi)
 *  • short description — profil kartochkasida va qidiruvda (max 120 belgi)
 *
 * Bu yerdagi matn "hero/banner" vazifasini bajaradi: taklif + tezlik + harakat.
 * Tavsif ostidagi RASM yoki GIF ni faqat @BotFather orqali qo'yish mumkin
 * (`/setdescriptionpic`) — Bot API'da bunday metod yo'q.
 */
async function setupDescriptions() {
  const brand = config.brand.name;
  const eta = config.brand.deliveryEtaMinutes;

  const description = [
    `🍕 ${brand} — issiq pitssa ${eta} daqiqada eshigingizda.`,
    '',
    '🔥 Har kuni yangi xamir va tabiiy mahsulotlar',
    '🚀 Tanlang → Buyurtma bering → Mazza qiling',
    `🛵 ${config.business.freeDeliveryFrom.toLocaleString('ru-RU')} so'mdan yuqori buyurtmaga yetkazish BEPUL`,
    '',
    '👇 Boshlash uchun pastdagi tugmani bosing',
  ].join('\n');

  const shortDescription = `Issiq pitssa ${eta} daqiqada. Tanlang, buyurtma bering, mazza qiling 🍕`;

  try {
    await bot.telegram.setMyDescription(description);
    await bot.telegram.setMyShortDescription(shortDescription);
    logger.info('Bot tavsifi yangilandi (start bosilishidan oldin ko‘rinadi)');
  } catch (err) {
    logger.warn('Bot tavsifini o‘rnatib bo‘lmadi', { message: err?.message });
  }
}

/**
 * Chatdagi ko'k «Menyu» tugmasini Mini App'ni ochadigan qilib sozlash —
 * foydalanuvchi uchun eng qisqa yo'l: bitta bosish.
 * HTTPS bo'lmasa, Telegram rad etadi, shuning uchun oddiy menyuga qaytaramiz.
 */
async function setupMenuButton() {
  const url = config.telegram.webAppUrl;
  const isHttps = /^https:\/\//i.test(url || '');

  try {
    await bot.telegram.setChatMenuButton({
      menuButton: isHttps
        ? { type: 'web_app', text: '🍕 Menyu', web_app: { url } }
        : { type: 'commands' },
    });

    logger.info('Chat menyu tugmasi sozlandi', { mode: isHttps ? 'web_app' : 'commands' });
  } catch (err) {
    logger.warn('Menyu tugmasini sozlab bo‘lmadi', { message: err?.message });
  }
}

/**
 * Aynan bitta chat uchun admin buyruqlarini ko'rsatish.
 * Telegram "scope" mexanizmi: boshqa foydalanuvchilar bu buyruqlarni ko'rmaydi.
 */
async function setAdminCommands(chatId) {
  try {
    await bot.telegram.setMyCommands(ADMIN_COMMANDS, {
      scope: { type: 'chat', chat_id: chatId },
    });
  } catch (err) {
    // "chat not found" — admin hali botga /start bosmagan. Bu normal holat:
    // menyu /start paytida startController tomonidan o'rnatiladi.
    const isChatUnknown = String(err?.message || '').includes('chat not found');
    const log = isChatUnknown ? logger.debug : logger.warn;

    log('Admin buyruqlari menyusi hozircha o‘rnatilmadi', {
      chatId,
      reason: isChatUnknown ? 'admin hali /start bosmagan' : err?.message,
    });
  }
}

/**
 * Telegram'ga webhook manzilini aytish.
 * Serverless'da (Vercel) bu deploy'dan keyin bir marta chaqiriladi:
 * `npm run telegram:setup`.
 */
async function registerWebhook() {
  const url = `${config.telegram.publicUrl}${config.telegram.webhookPath}`;

  await bot.telegram.setWebhook(url, {
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query'],
  });

  logger.info('Webhook ro‘yxatdan o‘tdi', { url });
  return url;
}

/**
 * Telegram tomonidagi barcha sozlamalar: buyruqlar, menyu tugmasi, tavsif.
 * Doimiy serverda `launch()` ichida, serverless'da esa alohida skript orqali.
 */
async function configureTelegram() {
  const me = await bot.telegram.getMe();
  logger.info('Bot autentifikatsiya qilindi', { username: `@${me.username}`, id: me.id });

  await setupCommands();
  await setupMenuButton();
  await setupDescriptions();

  try {
    const Admin = require('../models/Admin');
    const adminIds = await Admin.getChatIds();
    await Promise.all(adminIds.map(setAdminCommands));
    logger.info('Admin buyruqlari o‘rnatildi', { count: adminIds.length });
  } catch (err) {
    logger.warn('Admin buyruqlarini o‘rnatishda xato', { message: err?.message });
  }

  return me;
}

/**
 * Botni ishga tushirish (doimiy server uchun).
 * PUBLIC_URL berilgan bo'lsa — webhook, aks holda long polling.
 * @param {import('express').Express} app
 */
async function launch() {
  const me = await configureTelegram();

  if (config.telegram.useWebhook) {
    // Webhook callback allaqachon `app.js` da ulangan — bu yerda faqat
    // Telegram'ga manzilni aytamiz.
    await registerWebhook();
  } else {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    // launch() long polling'da promise'ni "ushlab turadi" — shuning uchun await qilinmaydi.
    bot.launch({ dropPendingUpdates: true }).catch((err) => {
      logger.error('Long polling to‘xtadi', err);
    });
    logger.info('Long polling rejimi ishga tushdi');
  }

  return me;
}

function stop(reason = 'SIGTERM') {
  try {
    bot.stop(reason);
  } catch {
    /* allaqachon to'xtagan */
  }
}

module.exports = {
  bot,
  safeSend,
  sendToAdmins,
  editMessage,
  sendLocation,
  setAdminCommands,
  configureTelegram,
  registerWebhook,
  launch,
  stop,
};
