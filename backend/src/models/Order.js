'use strict';

const db = require('../database/connection');

/**
 * Order modeli — buyurtma, uning pozitsiyalari va status tarixi.
 * Yaratish tranzaksiya ichida bo'ladi: orders + order_items + history bir atomik amal.
 */

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PREPARING',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
];

/** Statusni o'zbekcha, emoji bilan ko'rsatish. */
const STATUS_LABELS = {
  PENDING: '🕐 Kutish jarayonida',
  CONFIRMED: '💳 Tasdiqlandi — to‘lov kutilmoqda',
  PAID: '✅ To‘landi',
  PREPARING: '👨‍🍳 Tayyorlanmoqda',
  DELIVERING: '🛵 Yo‘lda',
  COMPLETED: '🎉 Yetkazildi',
  CANCELLED: '❌ Bekor qilindi',
};

/** Ruxsat etilgan status o'tishlari (holat mashinasi). */
const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

function toDTO(row, items = []) {
  if (!row) return null;
  return {
    id: Number(row.id),
    publicNo: row.public_no,
    userId: Number(row.user_id),
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || row.status,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total_amount,
    currency: row.currency,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    comment: row.comment,
    paymentMethod: row.payment_method,
    adminMessageId: row.admin_message_id ? Number(row.admin_message_id) : null,
    adminChatId: row.admin_chat_id ? Number(row.admin_chat_id) : null,
    createdAt: row.created_at,
    // JOIN orqali kelsa — mijoz ma'lumotlari
    customerTelegramId: row.telegram_id ? Number(row.telegram_id) : undefined,
    customerUsername: row.username,
    items: items.map((i) => ({
      id: Number(i.id),
      productId: i.product_id ? Number(i.product_id) : null,
      title: i.title_snapshot,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      total: i.unit_price * i.quantity,
      options: i.options || {},
    })),
  };
}

/**
 * Yangi buyurtma yaratish.
 * @param {object} payload
 * @param {number} payload.userId
 * @param {Array<{productId:number, title:string, unitPrice:number, quantity:number, options?:object}>} payload.items
 * @param {number} payload.subtotal
 * @param {number} payload.deliveryFee
 * @param {number} payload.total
 */
async function create(payload) {
  return db.transaction(async (client) => {
    const { rows: seqRows } = await client.query(
      `SELECT 'PZ-' || LPAD(nextval('order_public_no_seq')::text, 6, '0') AS public_no`
    );
    const publicNo = seqRows[0].public_no;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (public_no, user_id, status, subtotal, delivery_fee, total_amount, currency,
          customer_name, phone, address, latitude, longitude, comment, payment_method)
       VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        publicNo,
        payload.userId,
        payload.subtotal,
        payload.deliveryFee,
        payload.total,
        payload.currency || 'USD',
        payload.customerName || '',
        payload.phone || '',
        payload.address || '',
        payload.latitude ?? null,
        payload.longitude ?? null,
        payload.comment || null,
        payload.paymentMethod || 'CARD',
      ]
    );
    const order = orderRows[0];

    const itemRows = [];
    for (const item of payload.items) {
      const { rows } = await client.query(
        `INSERT INTO order_items
           (order_id, product_id, title_snapshot, unit_price, quantity, options)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [
          order.id,
          item.productId,
          item.title,
          item.unitPrice,
          item.quantity,
          JSON.stringify(item.options || {}),
        ]
      );
      itemRows.push(rows[0]);
    }

    await client.query(
      `INSERT INTO order_status_history (order_id, status, actor_id, note)
       VALUES ($1, 'PENDING', $2, 'Mini App orqali yaratildi')`,
      [order.id, payload.userId]
    );

    return toDTO(order, itemRows);
  });
}

async function findById(id) {
  const row = await db.one(
    `SELECT o.*, u.telegram_id, u.username
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [id]
  );
  if (!row) return null;

  const items = await db.many(
    `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`,
    [id]
  );
  return toDTO(row, items);
}

/** Foydalanuvchining buyurtmalari (pozitsiyalari bilan, N+1 siz). */
async function findByUserId(userId, limit = 20) {
  const rows = await db.many(
    `SELECT o.*, COALESCE(json_agg(oi.* ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map((r) => toDTO(r, r.items || []));
}

/**
 * Statusi bo'yicha buyurtmalar — admin paneli uchun.
 * @param {string[]} statuses
 */
async function findByStatuses(statuses, limit = 10) {
  const rows = await db.many(
    `SELECT o.*, u.telegram_id, u.username,
            COALESCE(json_agg(oi.* ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
     FROM orders o
     JOIN users u ON u.id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status = ANY($1::order_status[])
     GROUP BY o.id, u.telegram_id, u.username
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [statuses, limit]
  );
  return rows.map((r) => toDTO(r, r.items || []));
}

/** Bugungi kun kesimidagi statistika (admin `/stats`). */
async function getDailyStats(timeZone = 'Asia/Tashkent') {
  return db.one(
    `SELECT
       COUNT(*)::int                                                              AS total,
       COUNT(*) FILTER (WHERE status = 'PENDING')::int                            AS pending,
       COUNT(*) FILTER (WHERE status IN ('CONFIRMED','PAID','PREPARING','DELIVERING'))::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'COMPLETED')::int                          AS completed,
       COUNT(*) FILTER (WHERE status = 'CANCELLED')::int                          AS cancelled,
       COALESCE(SUM(total_amount) FILTER (WHERE status <> 'CANCELLED'), 0)::int    AS revenue,
       COALESCE(AVG(total_amount) FILTER (WHERE status <> 'CANCELLED'), 0)::int    AS avg_check
     FROM orders
     WHERE (created_at AT TIME ZONE $1)::date = (NOW() AT TIME ZONE $1)::date`,
    [timeZone]
  );
}

/** Adminga yuborilgan xabar ID'sini saqlash — keyin uni tahrirlash uchun. */
async function attachAdminMessage(orderId, chatId, messageId) {
  await db.query(
    `UPDATE orders SET admin_chat_id = $2, admin_message_id = $3 WHERE id = $1`,
    [orderId, chatId, messageId]
  );
}

/**
 * Statusni o'zgartirish. Holat mashinasi qoidalariga rioya qiladi.
 * @returns {Promise<{ok:boolean, reason?:string, order?:object}>}
 */
async function updateStatus(orderId, nextStatus, { actorId = null, note = null } = {}) {
  if (!STATUSES.includes(nextStatus)) {
    return { ok: false, reason: 'INVALID_STATUS' };
  }

  return db.transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    if (!rows.length) return { ok: false, reason: 'NOT_FOUND' };

    const current = rows[0].status;
    if (current === nextStatus) return { ok: false, reason: 'ALREADY_IN_STATUS' };
    if (!canTransition(current, nextStatus)) {
      return { ok: false, reason: 'TRANSITION_NOT_ALLOWED', from: current, to: nextStatus };
    }

    await client.query(
      `UPDATE orders
       SET status = $2, processed_by = COALESCE($3, processed_by), cancel_reason = COALESCE($4, cancel_reason)
       WHERE id = $1`,
      [orderId, nextStatus, actorId, nextStatus === 'CANCELLED' ? note : null]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, status, actor_id, note)
       VALUES ($1, $2, $3, $4)`,
      [orderId, nextStatus, actorId, note]
    );

    return { ok: true, from: current, to: nextStatus };
  });
}

module.exports = {
  STATUSES,
  STATUS_LABELS,
  TRANSITIONS,
  canTransition,
  toDTO,
  create,
  findById,
  findByUserId,
  findByStatuses,
  getDailyStats,
  attachAdminMessage,
  updateStatus,
};
