'use strict';

const { z } = require('zod');
const config = require('../config/default');
const Order = require('../models/Order');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { computeCart, CartError } = require('./cartController');
const botCore = require('../core/bot');
const kb = require('../utils/keyboards');
const { money, escapeHtml, dateTime, phone: fmtPhone } = require('../utils/format');
const logger = require('../utils/logger').child({ module: 'order' });

/**
 * Buyurtma oqimi:
 *
 *   Mini App ──POST /api/orders──► PENDING ──► adminga inline tugmali kartochka
 *                                              │
 *          ┌───────────────────────────────────┴──────────────────┐
 *          │ [✅ Tasdiqlash & To'lov linki]        [❌ Bekor qilish]│
 *          ▼                                                      ▼
 *      CONFIRMED → mijozga to'lov rekvizitlari yuboriladi     CANCELLED
 *          │
 *          │ admin to'lovni qo'lda tekshiradi → [💰 To'lov keldi]
 *          ▼
 *      PAID ──(avtomatik)──► PREPARING → DELIVERING → COMPLETED
 */

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(50),
    options: z.record(z.any()).optional(),
  })).min(1),
  customerName: z.string().trim().min(2, 'Ismni kiriting').max(80),
  phone: z.string().trim().min(7, 'Telefon raqamni kiriting').max(25),
  address: z.string().trim().min(5, 'Manzilni to‘liq kiriting').max(300),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  comment: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z.enum(['CARD', 'CASH']).default('CARD'),
});

// ────────────────────────────────────────────────────────────────
//  Xabar shablonlari
// ────────────────────────────────────────────────────────────────

/** Adminga yuboriladigan buyurtma kartochkasi (HTML). */
function renderAdminCard(order, customer) {
  const lines = order.items
    .map((i) => `   • ${escapeHtml(i.title)} × ${i.quantity} — <b>${money(i.total)}</b>`)
    .join('\n');

  const username = customer?.username ? `@${escapeHtml(customer.username)}` : '—';
  const mapLink =
    order.latitude && order.longitude
      ? `\n🗺 <a href="https://maps.google.com/?q=${order.latitude},${order.longitude}">Xaritada ochish</a>`
      : '';

  return [
    `🍕 <b>YANGI BUYURTMA ${escapeHtml(order.publicNo)}</b>`,
    `${Order.STATUS_LABELS[order.status]}`,
    '',
    `👤 <b>Mijoz:</b> ${escapeHtml(order.customerName)} (${username})`,
    `📱 <b>Telefon:</b> ${escapeHtml(fmtPhone(order.phone))}`,
    `📍 <b>Manzil:</b> ${escapeHtml(order.address)}${mapLink}`,
    order.comment ? `💬 <b>Izoh:</b> ${escapeHtml(order.comment)}` : null,
    '',
    '🧾 <b>Tarkibi:</b>',
    lines,
    '',
    `   Mahsulotlar: <b>${money(order.subtotal)}</b>`,
    `   Yetkazib berish: <b>${order.deliveryFee === 0 ? 'BEPUL' : money(order.deliveryFee)}</b>`,
    `   ─────────────────`,
    `   💰 <b>JAMI: ${money(order.total)}</b>`,
    '',
    `💳 <b>To‘lov turi:</b> ${order.paymentMethod === 'CASH' ? 'Naqd' : 'Karta'}`,
    `🕐 ${dateTime(order.createdAt)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Mijozga: buyurtma qabul qilindi. */
function renderCustomerCreated(order) {
  return [
    `✅ <b>Buyurtmangiz qabul qilindi!</b>`,
    '',
    `Raqami: <b>${escapeHtml(order.publicNo)}</b>`,
    `Summa: <b>${money(order.total)}</b>`,
    '',
    `Operatorimiz buyurtmani ko‘rib chiqmoqda va bir necha daqiqada`,
    `to‘lov ma’lumotlarini yuboradi. Iltimos, kuting 🙏`,
  ].join('\n');
}

/** Mijozga: admin tasdiqladi → to'lov rekvizitlari. */
function renderPaymentInstructions(order) {
  const { cardNumber, cardHolder, note } = config.business.payment;
  const eta = config.brand.deliveryEtaMinutes;

  if (order.paymentMethod === 'CASH') {
    return [
      `✅ <b>Buyurtma ${escapeHtml(order.publicNo)} tasdiqlandi!</b>`,
      '',
      `To‘lov turi: <b>Naqd pul</b> — kuryerga yetkazib berilganda to‘laysiz.`,
      `To‘lanadigan summa: <b>${money(order.total)}</b>`,
      '',
      `👨‍🍳 Pitssangiz tayyorlanishga qo‘yildi. Taxminiy vaqt — ${eta} daqiqa.`,
    ].join('\n');
  }

  return [
    `✅ <b>Buyurtma ${escapeHtml(order.publicNo)} tasdiqlandi!</b>`,
    '',
    `To‘lash uchun summa: <b>${money(order.total)}</b>`,
    '',
    `💳 <b>Karta raqami:</b>`,
    `<code>${escapeHtml(cardNumber)}</code>`,
    `👤 <b>Qabul qiluvchi:</b> ${escapeHtml(cardHolder)}`,
    '',
    note ? escapeHtml(note) : 'To‘lovdan so‘ng chek skrinshotini shu chatga yuboring.',
    `Operator tasdiqlagach, pitssangiz darhol tayyorlanadi 👨‍🍳`,
  ].join('\n');
}

const CUSTOMER_STATUS_MESSAGES = {
  PAID: (o) => `💰 <b>To‘lovingiz tasdiqlandi!</b>\nBuyurtma ${escapeHtml(o.publicNo)} tayyorlanmoqda 👨‍🍳`,
  PREPARING: (o) => `👨‍🍳 Buyurtma ${escapeHtml(o.publicNo)} oshxonada tayyorlanmoqda.`,
  DELIVERING: (o) => `🛵 Kuryerimiz ${escapeHtml(o.publicNo)} buyurtmangiz bilan yo‘lga chiqdi!`,
  COMPLETED: (o) =>
    `🎉 Buyurtma ${escapeHtml(o.publicNo)} yetkazildi. Yoqimli ishtaha!\n\nBizni tanlaganingiz uchun rahmat 🍕`,
  CANCELLED: (o) =>
    `❌ Afsuski, buyurtma ${escapeHtml(o.publicNo)} bekor qilindi.\nSavollar bo‘lsa operatorga yozing.`,
};

// ────────────────────────────────────────────────────────────────
//  REST API
// ────────────────────────────────────────────────────────────────

/** POST /api/orders — Mini App'dan buyurtmani qabul qilish. */
async function createOrder(req, res, next) {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ma’lumotlar to‘liq emas',
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const payload = parsed.data;

    // 1) Narxni serverda qayta hisoblash
    const cart = await computeCart(payload.items);

    // 2) Bazaga PENDING holatida yozish
    const order = await Order.create({
      userId: req.user.id,
      items: cart.items,
      subtotal: cart.subtotal,
      deliveryFee: cart.deliveryFee,
      total: cart.total,
      currency: cart.currency,
      customerName: payload.customerName,
      phone: payload.phone,
      address: payload.address,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      comment: payload.comment ?? null,
      paymentMethod: payload.paymentMethod,
    });

    // Telefonni profilga eslab qolamiz
    await User.setPhone(req.user.telegramId, payload.phone).catch(() => {});

    logger.info('Yangi buyurtma', {
      orderId: order.id,
      publicNo: order.publicNo,
      total: order.total,
      userId: req.user.id,
    });

    // 3) Javobni darhol qaytaramiz — Telegram'ga yuborish fonda ketadi
    res.status(201).json({
      ok: true,
      data: {
        id: order.id,
        publicNo: order.publicNo,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
      },
    });

    // 4) Fon vazifalari: mijozga tasdiq + adminlarga kartochka
    void dispatchNewOrder(order, req.user);
  } catch (err) {
    if (err instanceof CartError) {
      return res
        .status(err.status)
        .json({ ok: false, error: { code: err.code, message: err.message, details: err.details } });
    }
    next(err);
  }
}

/** Yangi buyurtmani Telegram'ga tarqatish (javobni bloklamaydi). */
async function dispatchNewOrder(order, customer) {
  try {
    await botCore.safeSend(customer.telegramId, renderCustomerCreated(order));

    const sent = await botCore.sendToAdmins(renderAdminCard(order, customer), {
      ...kb.adminOrderKeyboard(order.status, order.id),
    });

    if (sent.length) {
      // Birinchi admin xabari "asosiy" hisoblanadi va keyin tahrirlanadi
      await Order.attachAdminMessage(order.id, sent[0].chatId, sent[0].messageId);

      if (order.latitude && order.longitude) {
        await botCore.sendLocation(sent[0].chatId, order.latitude, order.longitude);
      }
    }
  } catch (err) {
    logger.error('Buyurtmani Telegram’ga yuborishda xato', err);
  }
}

/** GET /api/orders — foydalanuvchining buyurtmalari. */
async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.findByUserId(req.user.id, 20);
    res.json({ ok: true, data: orders });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders/:id — bitta buyurtma (faqat egasi yoki admin). */
async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Buyurtma topilmadi' } });
    }
    if (order.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Ruxsat yo‘q' } });
    }
    res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────────
//  Bot: admin inline tugmalari
// ────────────────────────────────────────────────────────────────

/** Callback action → yangi status. */
const ACTION_TO_STATUS = {
  confirm: 'CONFIRMED',
  paid: 'PAID',
  deliver: 'DELIVERING',
  done: 'COMPLETED',
  cancel: 'CANCELLED',
};

/**
 * Admin buyurtma kartochkasidagi tugmani bosganda.
 * @param {import('telegraf').Context} ctx
 */
async function handleAdminAction(ctx) {
  const { action, id } = kb.parseCallback(ctx.callbackQuery?.data);
  const actorId = ctx.from?.id;

  if (!(await Admin.isAdmin(actorId))) {
    return ctx.answerCbQuery('Bu amal faqat administrator uchun', { show_alert: true });
  }

  // Mijoz "chek yubordim" tugmasini bossa
  if (action === 'receipt') {
    await ctx.answerCbQuery('Chekni shu chatga rasm sifatida yuboring 📷');
    return;
  }

  const nextStatus = ACTION_TO_STATUS[action];
  if (!nextStatus) return ctx.answerCbQuery('Noma’lum amal');

  const result = await Order.updateStatus(id, nextStatus, { actorId, note: `Admin: ${action}` });

  if (!result.ok) {
    const messages = {
      NOT_FOUND: 'Buyurtma topilmadi',
      ALREADY_IN_STATUS: 'Bu holat allaqachon o‘rnatilgan',
      TRANSITION_NOT_ALLOWED: `Bu o‘tish mumkin emas (${result.from} → ${result.to})`,
    };
    return ctx.answerCbQuery(messages[result.reason] || 'Amalni bajarib bo‘lmadi', { show_alert: true });
  }

  // PAID → avtomatik PREPARING (biznes talabi)
  if (nextStatus === 'PAID') {
    await Order.updateStatus(id, 'PREPARING', { actorId, note: 'Avtomatik: to‘lovdan keyin' });
  }

  const order = await Order.findById(id);
  const customer = await User.findById(order.userId);

  // 1) Admin kartochkasini yangi status va yangi tugmalar bilan yangilash
  await botCore.editMessage(
    ctx.chat.id,
    ctx.callbackQuery.message.message_id,
    renderAdminCard(order, customer),
    { ...kb.adminOrderKeyboard(order.status, order.id) }
  );

  // 2) Mijozga xabar
  if (order.status === 'CONFIRMED') {
    await botCore.safeSend(customer.telegramId, renderPaymentInstructions(order), {
      ...kb.customerPaymentKeyboard(order.id),
    });
  } else {
    const template = CUSTOMER_STATUS_MESSAGES[order.status];
    if (template) await botCore.safeSend(customer.telegramId, template(order));
  }

  logger.info('Buyurtma statusi o‘zgardi', {
    orderId: id,
    from: result.from,
    to: order.status,
    actorId,
  });

  return ctx.answerCbQuery(`✅ ${Order.STATUS_LABELS[order.status]}`);
}

/** /orders — bot ichida buyurtmalar tarixi. */
async function sendOrderHistory(ctx) {
  const user = await User.findByTelegramId(ctx.from.id);
  if (!user) return ctx.reply('Avval /start buyrug‘ini yuboring.');

  const orders = await Order.findByUserId(user.id, 5);
  if (!orders.length) {
    return ctx.reply('Sizda hali buyurtmalar yo‘q. Menyudan tanlab ko‘ring 🍕', {
      ...kb.openAppInline(),
    });
  }

  const text = orders
    .map((o) =>
      [
        `<b>${escapeHtml(o.publicNo)}</b> — ${o.statusLabel}`,
        `   ${o.items.map((i) => `${escapeHtml(i.title)} ×${i.quantity}`).join(', ')}`,
        `   💰 ${money(o.total)} · ${dateTime(o.createdAt)}`,
      ].join('\n')
    )
    .join('\n\n');

  return ctx.replyWithHTML(`📋 <b>So‘nggi buyurtmalaringiz:</b>\n\n${text}`, { ...kb.openAppInline() });
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  handleAdminAction,
  sendOrderHistory,
  renderAdminCard,
};
