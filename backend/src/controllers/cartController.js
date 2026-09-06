'use strict';

const { z } = require('zod');
const config = require('../config/default');
const Product = require('../models/Product');
const logger = require('../utils/logger').child({ module: 'cart' });

/**
 * Katalog va savat (narx hisob-kitobi) controller'i.
 *
 * XAVFSIZLIK QOIDASI: mijoz yuborgan narxlarga HECH QACHON ishonilmaydi.
 * Savat har doim server tomonida, bazadagi joriy narxlar bo'yicha qayta hisoblanadi.
 */

const cartItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(50),
  options: z.record(z.any()).optional().default({}),
});

const cartSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Savat bo‘sh').max(40),
});

class CartError extends Error {
  constructor(message, code = 'CART_ERROR', details = null) {
    super(message);
    this.name = 'CartError';
    this.code = code;
    this.details = details;
    this.status = 400;
  }
}

/**
 * Savatni server tomonida qayta hisoblash.
 * @param {Array<{productId:number, quantity:number, options?:object}>} rawItems
 */
async function computeCart(rawItems) {
  const parsed = cartSchema.safeParse({ items: rawItems });
  if (!parsed.success) {
    throw new CartError('Savat ma’lumotlari noto‘g‘ri', 'INVALID_CART', parsed.error.flatten());
  }

  const items = parsed.data.items;
  const productMap = await Product.findMapByIds(items.map((i) => i.productId));

  const unavailable = [];
  const normalized = [];

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      unavailable.push({ productId: item.productId, reason: 'NOT_FOUND' });
      continue;
    }
    if (!product.isAvailable) {
      unavailable.push({ productId: item.productId, title: product.title, reason: 'OUT_OF_STOCK' });
      continue;
    }

    normalized.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.imageUrl,
      unitPrice: product.price, // ← narx faqat bazadan
      quantity: item.quantity,
      total: product.price * item.quantity,
      options: item.options || {},
    });
  }

  if (unavailable.length) {
    throw new CartError(
      'Ba’zi mahsulotlar hozir mavjud emas. Savatni yangilang.',
      'ITEMS_UNAVAILABLE',
      { unavailable }
    );
  }

  const subtotal = normalized.reduce((sum, i) => sum + i.total, 0);
  const deliveryFee =
    subtotal >= config.business.freeDeliveryFrom ? 0 : config.business.deliveryFee;
  const total = subtotal + deliveryFee;

  return {
    items: normalized,
    subtotal,
    deliveryFee,
    total,
    currency: config.business.currency,
    freeDeliveryFrom: config.business.freeDeliveryFrom,
    isFreeDelivery: deliveryFee === 0,
  };
}

/** GET /api/catalog — kategoriyalar + mahsulotlar + biznes sozlamalari. */
async function getCatalog(req, res, next) {
  try {
    const [categories, products] = await Promise.all([
      Product.findCategories(),
      Product.findAll(),
    ]);

    res.json({
      ok: true,
      data: {
        categories,
        products: products.filter((p) => !p.isAddon),
        addons: products.filter((p) => p.isAddon), // Order Bump uchun
        settings: {
          currency: config.business.currency,
          currencySymbol: config.business.currencySymbol,
          deliveryFee: config.business.deliveryFee,
          freeDeliveryFrom: config.business.freeDeliveryFrom,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/stories — bosh sahifadagi storis bloki. */
async function getStories(req, res, next) {
  try {
    const stories = await Product.findStories();
    res.json({ ok: true, data: stories });
  } catch (err) {
    next(err);
  }
}

/** POST /api/cart/validate — checkout'dan oldin narxni tekshirish/yangilash. */
async function validateCart(req, res, next) {
  try {
    const summary = await computeCart(req.body?.items || []);
    res.json({ ok: true, data: summary });
  } catch (err) {
    if (err instanceof CartError) {
      logger.warn('Savat validatsiyasi rad etildi', { code: err.code });
      return res
        .status(err.status)
        .json({ ok: false, error: { code: err.code, message: err.message, details: err.details } });
    }
    next(err);
  }
}

module.exports = { computeCart, getCatalog, getStories, validateCart, CartError };
