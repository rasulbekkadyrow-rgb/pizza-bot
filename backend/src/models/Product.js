'use strict';

const db = require('../database/connection');
const cache = require('../utils/cache');

/**
 * Product modeli — katalog va narx hisob-kitobi uchun yagona manba (source of truth).
 * MUHIM: narx HAR DOIM bazadan olinadi, mijoz yuborgan narxga ishonilmaydi.
 */

const SELECT_FIELDS = `
  p.id, p.slug, p.title, p.description, p.image_url, p.video_url,
  p.price, p.old_price, p.ingredients, p.badges,
  p.weight_grams, p.kcal, p.is_bestseller, p.is_addon, p.is_available, p.sort_order,
  c.slug AS category_slug, c.title AS category_title, c.emoji AS category_emoji
`;

function toDTO(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    slug: row.slug,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    price: row.price,
    oldPrice: row.old_price,
    discountPercent:
      row.old_price && row.old_price > row.price
        ? Math.round((1 - row.price / row.old_price) * 100)
        : 0,
    ingredients: row.ingredients || [],
    badges: row.badges || [],
    weightGrams: row.weight_grams,
    kcal: row.kcal,
    isBestseller: row.is_bestseller,
    isAddon: row.is_addon,
    isAvailable: row.is_available,
    category: row.category_slug
      ? { slug: row.category_slug, title: row.category_title, emoji: row.category_emoji }
      : null,
  };
}

/**
 * Katalog keshi.
 *
 * Baza `us-east-2` da — har bir so'rov ~150ms, sovuq ulanish ~2.5s.
 * Katalog kuniga bir marta o'zgaradi, shuning uchun u xotirada 5 daqiqa
 * saqlanadi va muddati tugagach fonda yangilanadi (foydalanuvchi kutmaydi).
 * Mahsulot o'zgartirilsa `invalidateCatalog()` chaqiriladi.
 */
const CATALOG_TTL_MS = 5 * 60_000;

/** Barcha mavjud mahsulotlar (order bump mahsulotlari ham). */
async function findAll() {
  return cache.remember(
    'products',
    async () => {
      const rows = await db.many(
        `SELECT ${SELECT_FIELDS}
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.is_available
         ORDER BY p.sort_order, p.id`
      );
      return rows.map(toDTO);
    },
    CATALOG_TTL_MS
  );
}

async function findCategories() {
  return cache.remember(
    'categories',
    async () => {
      const rows = await db.many(
        `SELECT slug, title, emoji, sort_order
         FROM categories WHERE is_active ORDER BY sort_order, id`
      );
      return rows.map((r) => ({ slug: r.slug, title: r.title, emoji: r.emoji }));
    },
    CATALOG_TTL_MS
  );
}

/** Mahsulot/kategoriya o'zgartirilganda keshni tozalash. */
function invalidateCatalog() {
  cache.invalidate('products');
  cache.invalidate('categories');
  cache.invalidate('stories');
}

/** Boot paytida keshni to'ldirish — birinchi mijoz kutmasligi uchun. */
async function warmCatalog() {
  await Promise.all([findAll(), findCategories(), findStories()]);
}

async function findBySlug(slug) {
  const row = await db.one(
    `SELECT ${SELECT_FIELDS}
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1`,
    [slug]
  );
  return toDTO(row);
}

/**
 * Berilgan ID'lar bo'yicha mahsulotlarni Map ko'rinishida qaytaradi.
 * Buyurtmani serverda qayta hisoblash uchun ishlatiladi.
 * @param {number[]} ids
 * @returns {Promise<Map<number, ReturnType<typeof toDTO>>>}
 */
async function findMapByIds(ids) {
  const unique = [...new Set(ids.map(Number).filter(Number.isFinite))];
  if (!unique.length) return new Map();

  const rows = await db.many(
    `SELECT ${SELECT_FIELDS}
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ANY($1::bigint[])`,
    [unique]
  );

  return new Map(rows.map((r) => [Number(r.id), toDTO(r)]));
}

/** Storis bloki uchun (katalog bilan bir joyda saqlanadi). */
async function findStories() {
  return cache.remember('stories', loadStories, CATALOG_TTL_MS);
}

async function loadStories() {
  const rows = await db.many(
    `SELECT id, title, cover_url, image_url, body, cta_label, cta_target, accent
     FROM stories WHERE is_active ORDER BY sort_order, id`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    coverUrl: r.cover_url,
    imageUrl: r.image_url,
    body: r.body,
    ctaLabel: r.cta_label,
    ctaTarget: r.cta_target,
    accent: r.accent,
  }));
}

module.exports = {
  toDTO,
  findAll,
  findCategories,
  findBySlug,
  findMapByIds,
  findStories,
  invalidateCatalog,
  warmCatalog,
};
