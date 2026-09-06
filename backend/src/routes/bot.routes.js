'use strict';

const startController = require('../controllers/startController');
const orderController = require('../controllers/orderController');
const adminController = require('../controllers/adminController');
const Admin = require('../models/Admin');
const { escapeHtml } = require('../utils/format');
const logger = require('../utils/logger').child({ module: 'bot.routes' });

/**
 * Bot "marshrutlari" — barcha Telegram update'lari shu yerda controller'larga bog'lanadi.
 * `src/index.js` uni bir marta chaqiradi.
 *
 * @param {import('telegraf').Telegraf} bot
 */
function registerBotHandlers(bot) {
  // ── Kirish/log middleware ──────────────────────────────────
  bot.use(async (ctx, next) => {
    const startedAt = Date.now();
    await next();
    logger.debug('Update qayta ishlandi', {
      type: ctx.updateType,
      from: ctx.from?.id,
      ms: Date.now() - startedAt,
    });
  });

  // ── Buyruqlar ──────────────────────────────────────────────
  bot.start(startController.onStart);
  bot.command('menu', startController.onMenu);
  bot.command('help', startController.onHelp);
  bot.command('id', startController.onWhoAmI);
  bot.command('orders', orderController.sendOrderHistory);

  // ── Admin buyruqlari ───────────────────────────────────────
  bot.command('admin', adminController.onEnroll);
  bot.command('panel', adminController.onPanel);
  bot.command('stats', adminController.onStats);
  bot.command('pending', adminController.onPending);
  bot.command('admins', adminController.onListAdmins);
  bot.command('addadmin', adminController.onAddAdmin);
  bot.command('deladmin', adminController.onDelAdmin);

  bot.action(/^admin:(pending|stats|admins)$/, adminController.handlePanelAction);

  // ── Reply-klaviatura tugmalari ─────────────────────────────
  bot.hears('🍕 Buyurtma berish', startController.onMenu);
  bot.hears('📋 Mening buyurtmalarim', orderController.sendOrderHistory);
  bot.hears('📞 Aloqa', startController.onHelp);
  bot.hears('👑 Admin panel', adminController.onPanel);

  // ── Kontakt (telefon raqam) ────────────────────────────────
  bot.on('contact', startController.onContact);

  // ── Admin inline tugmalari: order:<action>:<id> ────────────
  bot.action(/^order:(confirm|paid|deliver|done|cancel|receipt):(\d+)$/, orderController.handleAdminAction);

  // ── To'lov cheki (rasm) → adminlarga yo'naltirish ──────────
  bot.on('photo', async (ctx) => {
    const admins = await Admin.getChatIds();
    if (!admins.length) return ctx.reply('Rahmat! Operator tez orada tekshiradi.');

    const from = ctx.from;
    const caption = [
      '🧾 <b>To‘lov cheki keldi</b>',
      `👤 ${escapeHtml(from.first_name || '')} ${from.username ? `(@${escapeHtml(from.username)})` : ''}`,
      `🆔 <code>${from.id}</code>`,
    ].join('\n');

    await Promise.all(
      admins.map((chatId) =>
        ctx.telegram
          .forwardMessage(chatId, ctx.chat.id, ctx.message.message_id)
          .then(() => ctx.telegram.sendMessage(chatId, caption, { parse_mode: 'HTML' }))
          .catch((err) => logger.warn('Chekni adminga yuborib bo‘lmadi', { chatId, message: err.message }))
      )
    );

    return ctx.reply('✅ Chek qabul qilindi! Operator tasdiqlagach, buyurtmangiz tayyorlanadi.');
  });

  // ── Mini App'dan sendData() orqali kelgan ma'lumot (zaxira oqim) ──
  bot.on('web_app_data', async (ctx) => {
    logger.info('web_app_data qabul qilindi', { from: ctx.from.id });
    return ctx.reply('Buyurtmangiz qabul qilindi, tekshirilmoqda ⏳');
  });

  // ── Qolgan matnlar ─────────────────────────────────────────
  bot.on('text', startController.onFallbackText);

  logger.info('Bot handler’lari ro‘yxatdan o‘tdi');
  return bot;
}

module.exports = { registerBotHandlers };
