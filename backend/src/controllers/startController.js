'use strict';

const config = require('../config/default');
const User = require('../models/User');
const Admin = require('../models/Admin');
const botCore = require('../core/bot');
const kb = require('../utils/keyboards');
const { escapeHtml } = require('../utils/format');
const logger = require('../utils/logger').child({ module: 'start' });

/**
 * Bot bilan "tanishuv" oqimi: /start, /help, /id, kontakt qabul qilish.
 * Matnlardagi brend ma'lumotlari `.env` dan keladi (BRAND_*, SUPPORT_*).
 */

const WELCOME = (name) =>
  [
    `Assalomu alaykum, <b>${escapeHtml(name)}</b>! 👋`,
    '',
    `Bu — <b>${escapeHtml(config.brand.name)}</b> rasmiy boti 🍕`,
    `Shahardagi eng mazali pitssani <b>${config.brand.deliveryEtaMinutes} daqiqada</b> yetkazib beramiz.`,
    '',
    'Menyuni ochish uchun pastdagi tugmani bosing 👇',
  ].join('\n');

const HELP = () =>
  [
    'ℹ️ <b>Yordam</b>',
    '',
    '🍕 <b>Buyurtma berish</b> — pastdagi «Buyurtma berish» tugmasi orqali ilovani oching.',
    '📋 /orders — buyurtmalaringiz tarixi.',
    `🕐 <b>Ish vaqti:</b> ${escapeHtml(config.brand.workHours)}`,
    config.brand.supportPhone ? `📞 <b>Aloqa:</b> ${escapeHtml(config.brand.supportPhone)}` : null,
    config.brand.supportUsername
      ? `💬 <b>Operator:</b> @${escapeHtml(config.brand.supportUsername)}`
      : null,
    '',
    'Savol yoki taklifingiz bo‘lsa — shu chatga yozing, operator javob beradi.',
  ]
    .filter(Boolean)
    .join('\n');

/**
 * /start
 *
 * TEZLIK: javob bazaga BOG'LIQ EMAS. Ism `ctx.from` dan olinadi,
 * adminlik esa `.env` ro'yxatidan (sinxron) tekshiriladi — shuning uchun
 * xabar darhol ketadi. Bazaga yozish va admin menyusini sozlash fonda bajariladi.
 *
 * BARQARORLIK: baza yiqilgan bo'lsa ham foydalanuvchi salomlashuvni oladi.
 */
async function onStart(ctx) {
  const name = ctx.from.first_name || 'do‘stim';
  // Sinxron tekshiruv — DB so'roviga kutib turmaymiz
  const isEnvAdmin = config.telegram.adminChatIds.includes(ctx.from.id);

  // ── 1) DARHOL javob ─────────────────────────────────────────
  await ctx.replyWithHTML(WELCOME(name), { ...kb.mainMenu(isEnvAdmin) });

  // ── 2) Qolgan hammasi fonda ─────────────────────────────────
  void finishStart(ctx, isEnvAdmin).catch((err) =>
    logger.error('/start fon vazifasi bajarilmadi', err)
  );
}

/** /start ning "og'ir" qismi — foydalanuvchi allaqachon javob olgan. */
async function finishStart(ctx, isEnvAdmin) {
  const user = await User.upsertFromTelegram(ctx.from);
  const isAdmin = isEnvAdmin || (await Admin.isAdmin(ctx.from.id));

  logger.info('Foydalanuvchi start bosdi', {
    telegramId: user.telegramId,
    username: user.username,
    isAdmin,
  });

  if (isAdmin) {
    // Server ishga tushganda chat hali mavjud bo'lmasligi mumkin ("chat not found"),
    // shuning uchun admin buyruqlari menyusini aynan shu yerda o'rnatamiz.
    await botCore.setAdminCommands(ctx.chat.id);
    await ctx.replyWithHTML(
      '👑 Siz <b>administratorsiz</b>. Barcha yangi buyurtmalar shu chatga tushadi.\n' +
        '/panel — boshqaruv menyusi.'
    );
  }

  // WEBAPP_URL HTTPS bo'lmasa, Telegram web_app tugmasini ko'rsata olmaydi.
  if (!kb.canOpenWebApp()) {
    await ctx.replyWithHTML(
      [
        '⚠️ <b>Dev rejimi:</b> <code>WEBAPP_URL</code> HTTPS emas,',
        'shuning uchun «Buyurtma berish» tugmasi ilovani ocha olmaydi.',
        '',
        'Tuzatish: <code>npx cloudflared tunnel --url http://localhost:3000</code>',
        'olingan HTTPS linkni .env → <code>WEBAPP_URL</code> ga yozing va serverni qayta ishga tushiring.',
      ].join('\n')
    );
  }
}

/** /menu va «🍕 Buyurtma berish» */
async function onMenu(ctx) {
  if (!kb.canOpenWebApp()) {
    return ctx.replyWithHTML(
      '⚠️ Ilova hozircha ochilmaydi — <code>WEBAPP_URL</code> HTTPS emas.\n' +
        'Administrator tunnel/domenni sozlaganidan keyin tugma ishlaydi.'
    );
  }
  return ctx.replyWithHTML('Menyu tayyor! Tanlashni boshlaymizmi? 😋', { ...kb.openAppInline() });
}

/** /help va «📞 Aloqa» */
async function onHelp(ctx) {
  return ctx.replyWithHTML(HELP());
}

/** /id — o'z chat ID'sini bilib olish (adminlikni sozlash uchun). */
async function onWhoAmI(ctx) {
  const isAdmin = await Admin.isAdmin(ctx.from.id);

  const lines = [
    `🆔 <b>Sizning ID:</b> <code>${ctx.from.id}</code>`,
    `💬 <b>Chat ID:</b> <code>${ctx.chat.id}</code>`,
    `👑 <b>Status:</b> ${isAdmin ? 'Administrator' : 'Mijoz'}`,
  ];

  if (!isAdmin) {
    lines.push(
      '',
      'Admin bo‘lish uchun ikki yo‘l bor:',
      '1️⃣ <code>/admin KOD</code> — .env dagi <code>ADMIN_SETUP_CODE</code> bilan.',
      '2️⃣ Yuqoridagi ID ni .env → <code>ADMIN_CHAT_IDS</code> ga qo‘shib, serverni qayta ishga tushiring.'
    );
  }

  return ctx.replyWithHTML(lines.join('\n'));
}

/** Kontakt yuborilganda — telefonni saqlash. */
async function onContact(ctx) {
  const contact = ctx.message.contact;

  if (contact.user_id !== ctx.from.id) {
    return ctx.reply('Iltimos, o‘zingizning raqamingizni yuboring 🙏');
  }

  await User.setPhone(ctx.from.id, contact.phone_number);
  const isAdmin = await Admin.isAdmin(ctx.from.id);

  return ctx.replyWithHTML('✅ Raqamingiz saqlandi. Endi buyurtma berishingiz mumkin!', {
    ...kb.mainMenu(isAdmin),
  });
}

/** Tushunilmagan matn — yumshoq yo'naltirish. */
async function onFallbackText(ctx) {
  return ctx.replyWithHTML(
    'Buyurtma berish uchun menyuni oching 👇\nSavolingiz bo‘lsa — yozing, operator javob beradi.',
    { ...kb.openAppInline() }
  );
}

module.exports = { onStart, onMenu, onHelp, onWhoAmI, onContact, onFallbackText };
