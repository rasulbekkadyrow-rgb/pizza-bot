'use strict';

const config = require('../config/default');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const botCore = require('../core/bot');
const kb = require('../utils/keyboards');
const { money, escapeHtml, dateTime, phone: fmtPhone } = require('../utils/format');
const logger = require('../utils/logger').child({ module: 'adminController' });

/**
 * Admin paneli — bot ichida.
 *
 *   /admin <kod>   → o'zini admin qilib tayinlash (bir martalik kod bilan)
 *   /panel         → boshqaruv menyusi
 *   /stats         → bugungi statistika
 *   /pending       → e'tibor talab qiladigan buyurtmalar
 *   /admins        → adminlar ro'yxati
 *   /addadmin <id> → admin qo'shish
 *   /deladmin <id> → adminlikdan olib tashlash
 */

// ────────────────────────────────────────────────────────────────
//  Guard
// ────────────────────────────────────────────────────────────────

/**
 * Handler'ni faqat adminlar uchun o'raydi.
 * Admin bo'lmagan foydalanuvchiga buyruq umuman mavjud emasdek javob beriladi
 * (mavjudligini oshkor qilmaslik uchun).
 * @param {(ctx: import('telegraf').Context) => Promise<unknown>} handler
 */
function adminOnly(handler) {
  return async (ctx) => {
    if (!(await Admin.isAdmin(ctx.from?.id))) {
      logger.warn('Admin buyrug‘iga ruxsatsiz urinish', {
        telegramId: ctx.from?.id,
        text: ctx.message?.text,
      });
      return ctx.reply('Bu buyruq mavjud emas. /help ni ko‘ring.');
    }
    return handler(ctx);
  };
}

// ────────────────────────────────────────────────────────────────
//  /admin <kod> — o'zini admin qilib tayinlash
// ────────────────────────────────────────────────────────────────

async function onEnroll(ctx) {
  const code = (ctx.message.text || '').split(/\s+/).slice(1).join(' ').trim();

  // Kodni chatda qoldirmaymiz — xavfsizlik uchun xabarni o'chirishga urinamiz.
  ctx.deleteMessage().catch(() => {});

  if (await Admin.isAdmin(ctx.from.id)) {
    return sendPanel(ctx, '👑 Siz allaqachon adminsiz.');
  }

  if (!code) {
    return ctx.replyWithHTML(
      [
        '🔐 <b>Admin rejimi</b>',
        '',
        'Foydalanish: <code>/admin KOD</code>',
        'Kod backend <code>.env</code> faylidagi <code>ADMIN_SETUP_CODE</code> qiymati.',
      ].join('\n')
    );
  }

  const result = await Admin.enrollWithCode(ctx.from, code);

  if (!result.ok) {
    const messages = {
      DISABLED: '⛔️ Kod orqali admin bo‘lish o‘chirilgan (ADMIN_SETUP_DISABLED).',
      BAD_CODE: '❌ Kod noto‘g‘ri.',
      ALREADY_ADMIN: '👑 Siz allaqachon adminsiz.',
    };
    return ctx.reply(messages[result.reason] || 'Amalni bajarib bo‘lmadi.');
  }

  // Shu chatda admin buyruqlari menyusi paydo bo'lsin
  await botCore.setAdminCommands(ctx.chat.id);

  return sendPanel(
    ctx,
    [
      '👑 <b>Tabriklaymiz — siz adminsiz!</b>',
      '',
      `🆔 ID: <code>${ctx.from.id}</code>`,
      '',
      'Endi barcha yangi buyurtmalar shu chatga tushadi.',
      '',
      '⚠️ <b>Xavfsizlik:</b> <code>ADMIN_SETUP_CODE</code> ni .env da o‘zgartiring',
      'yoki <code>ADMIN_SETUP_DISABLED=true</code> qiling.',
    ].join('\n')
  );
}

// ────────────────────────────────────────────────────────────────
//  /panel — boshqaruv menyusi
// ────────────────────────────────────────────────────────────────

async function sendPanel(ctx, header) {
  const stats = await Order.getDailyStats();

  const text = [
    header || `👑 <b>${escapeHtml(config.brand.name)} — admin panel</b>`,
    '',
    '📊 <b>Bugun:</b>',
    `   Buyurtmalar: <b>${stats.total}</b>`,
    `   Kutilmoqda: <b>${stats.pending}</b> · Jarayonda: <b>${stats.in_progress}</b>`,
    `   Tushum: <b>${money(stats.revenue)}</b>`,
  ].join('\n');

  return ctx.replyWithHTML(text, { ...kb.adminPanelKeyboard() });
}

const onPanel = adminOnly((ctx) => sendPanel(ctx));

// ────────────────────────────────────────────────────────────────
//  /stats — bugungi statistika
// ────────────────────────────────────────────────────────────────

async function renderStats() {
  const s = await Order.getDailyStats();

  return [
    '📊 <b>Bugungi statistika</b>',
    '',
    `🧾 Jami buyurtmalar: <b>${s.total}</b>`,
    `🕐 Kutilmoqda: <b>${s.pending}</b>`,
    `👨‍🍳 Jarayonda: <b>${s.in_progress}</b>`,
    `🎉 Yakunlangan: <b>${s.completed}</b>`,
    `❌ Bekor qilingan: <b>${s.cancelled}</b>`,
    '',
    `💰 Tushum: <b>${money(s.revenue)}</b>`,
    `🧮 O‘rtacha chek: <b>${money(s.avg_check)}</b>`,
  ].join('\n');
}

const onStats = adminOnly(async (ctx) => ctx.replyWithHTML(await renderStats()));

// ────────────────────────────────────────────────────────────────
//  /pending — e'tibor talab qiladigan buyurtmalar
// ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PAID', 'PREPARING', 'DELIVERING'];

const onPending = adminOnly(async (ctx) => {
  const orders = await Order.findByStatuses(ACTIVE_STATUSES, 10);

  if (!orders.length) {
    return ctx.replyWithHTML('✅ Faol buyurtmalar yo‘q. Hammasi yopilgan!');
  }

  await ctx.replyWithHTML(`📋 <b>Faol buyurtmalar: ${orders.length} ta</b>`);

  // Har bir buyurtma — o'z tugmalari bilan alohida kartochka
  for (const order of orders) {
    const text = [
      `${Order.STATUS_LABELS[order.status]}`,
      `🧾 <b>${escapeHtml(order.publicNo)}</b> · ${dateTime(order.createdAt)}`,
      '',
      `👤 ${escapeHtml(order.customerName)} · ${escapeHtml(fmtPhone(order.phone))}`,
      `📍 ${escapeHtml(order.address)}`,
      '',
      order.items.map((i) => `   • ${escapeHtml(i.title)} × ${i.quantity}`).join('\n'),
      '',
      `💰 <b>${money(order.total)}</b>`,
    ].join('\n');

    const sent = await ctx.replyWithHTML(text, { ...kb.adminOrderKeyboard(order.status, order.id) });

    // Endi status o'zgarganda aynan shu (oxirgi) kartochka tahrirlanadi
    await Order.attachAdminMessage(order.id, sent.chat.id, sent.message_id).catch(() => {});
  }

  return undefined;
});

// ────────────────────────────────────────────────────────────────
//  Adminlarni boshqarish
// ────────────────────────────────────────────────────────────────

const onListAdmins = adminOnly(async (ctx) => {
  const admins = await Admin.list();

  const rows = admins.map((a, i) => {
    const tag = a.username ? `@${escapeHtml(a.username)}` : escapeHtml(a.fullName);
    const badge = a.source === 'env' ? '🔒 .env' : a.source === 'env+db' ? '🔒 .env + baza' : '🗄 baza';
    return `${i + 1}. ${tag} — <code>${a.telegramId}</code> · ${badge}`;
  });

  return ctx.replyWithHTML(
    [
      `👑 <b>Adminlar: ${admins.length} ta</b>`,
      '',
      rows.join('\n') || '— hech kim yo‘q —',
      '',
      'Qo‘shish: <code>/addadmin 123456789</code>',
      'Olib tashlash: <code>/deladmin 123456789</code>',
      '',
      '🔒 belgisi — <code>.env</code> dagi admin, uni bot orqali o‘chirib bo‘lmaydi.',
    ].join('\n')
  );
});

const onAddAdmin = adminOnly(async (ctx) => {
  const id = Number((ctx.message.text || '').split(/\s+/)[1]);

  if (!Number.isFinite(id)) {
    return ctx.replyWithHTML('Foydalanish: <code>/addadmin 123456789</code>');
  }
  if (await Admin.isAdmin(id)) {
    return ctx.reply('Bu foydalanuvchi allaqachon admin.');
  }

  await Admin.grant(id);
  await botCore.setAdminCommands(id);
  await botCore.safeSend(
    id,
    '👑 Sizga <b>administrator</b> huquqi berildi. /panel — boshqaruv menyusi.'
  );

  return ctx.replyWithHTML(`✅ <code>${id}</code> admin qilib tayinlandi.`);
});

const onDelAdmin = adminOnly(async (ctx) => {
  const id = Number((ctx.message.text || '').split(/\s+/)[1]);

  if (!Number.isFinite(id)) {
    return ctx.replyWithHTML('Foydalanish: <code>/deladmin 123456789</code>');
  }
  if (id === ctx.from.id) {
    return ctx.reply('O‘zingizni adminlikdan olib tashlay olmaysiz.');
  }

  const result = await Admin.revoke(id);
  if (!result.ok) {
    return ctx.replyWithHTML(
      `⛔️ <code>${id}</code> — <code>.env</code> dagi admin. Uni ADMIN_CHAT_IDS dan olib tashlang.`
    );
  }

  return ctx.replyWithHTML(`✅ <code>${id}</code> adminlikdan olib tashlandi.`);
});

// ────────────────────────────────────────────────────────────────
//  Inline tugmalar: admin:<action>
// ────────────────────────────────────────────────────────────────

async function handlePanelAction(ctx) {
  if (!(await Admin.isAdmin(ctx.from?.id))) {
    return ctx.answerCbQuery('Faqat administrator uchun', { show_alert: true });
  }

  const [, action] = String(ctx.callbackQuery.data || '').split(':');

  switch (action) {
    case 'stats':
      await ctx.replyWithHTML(await renderStats());
      break;
    case 'pending':
      await onPending(ctx);
      break;
    case 'admins':
      await onListAdmins(ctx);
      break;
    default:
      return ctx.answerCbQuery('Noma’lum amal');
  }

  return ctx.answerCbQuery();
}

module.exports = {
  adminOnly,
  onEnroll,
  onPanel,
  onStats,
  onPending,
  onListAdmins,
  onAddAdmin,
  onDelAdmin,
  handlePanelAction,
};
