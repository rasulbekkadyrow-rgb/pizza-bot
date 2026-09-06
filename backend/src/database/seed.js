'use strict';

/**
 * Demo ma'lumotlar: `npm run db:seed`
 * Idempotent — slug bo'yicha UPSERT qiladi, qayta ishga tushirsa dublikat yaratmaydi.
 *
 * NARXLAR: O'zbekiston so'mida, butun sonda (tiyin ishlatilmaydi).
 * RASMLAR: har biri brauzerda ko'z bilan tekshirilgan — mahsulotga mos keladi.
 */

require('../config/default').assertConfig();
const db = require('./connection');
const logger = require('../utils/logger');

const IMG = 'https://images.unsplash.com/';
const q = '?auto=format&fit=crop&w=900&q=80';

const CATEGORIES = [
  { slug: 'cheese-pizza', title: 'Pishloqli', emoji: '🧀', sort_order: 1 },
  { slug: 'meat-pizza', title: "Go'shtli", emoji: '🥩', sort_order: 2 },
  { slug: 'veggie-pizza', title: 'Sabzavotli', emoji: '🥬', sort_order: 3 },
  { slug: 'drinks', title: 'Ichimliklar', emoji: '🥤', sort_order: 4 },
  { slug: 'sides', title: "Qo'shimchalar", emoji: '🍟', sort_order: 5 },
];

const PRODUCTS = [
  {
    category: 'cheese-pizza',
    slug: 'quattro-formaggi',
    title: "To'rt pishloqli",
    description:
      "To'rt xil pishloq uyg'unligi: mozzarella, gorgonzola, parmezan va fontina.",
    image_url: `${IMG}photo-1513104890138-7c749659a591${q}`,
    price: 79000,
    old_price: 99000,
    ingredients: ['Mozzarella', 'Gorgonzola', 'Parmezan', 'Fontina', 'Rayhon', 'Zaytun moyi'],
    badges: ['Xit', '100% tabiiy'],
    weight_grams: 520,
    kcal: 1180,
    is_bestseller: true,
    sort_order: 1,
  },
  {
    category: 'cheese-pizza',
    slug: 'margherita-classic',
    title: 'Margarita',
    description: "Napoli klassikasi: pomidor sousi, yangi mozzarella va rayhon barglari.",
    image_url: `${IMG}photo-1604068549290-dea0e4a305ca${q}`,
    price: 59000,
    old_price: 75000,
    ingredients: ['Pomidor sousi', 'Mozzarella', 'Rayhon', 'Zaytun moyi'],
    badges: ['Klassika'],
    weight_grams: 470,
    kcal: 950,
    is_bestseller: true,
    sort_order: 2,
  },
  {
    category: 'meat-pizza',
    slug: 'pepperoni-fire',
    title: 'Achchiq Pepperoni',
    description:
      "Ikki barobar pepperoni, achchiq qalampir va tutunlangan mozzarella — o'tkir ta'm sevuvchilarga.",
    image_url: `${IMG}photo-1628840042765-356cda07504e${q}`,
    price: 89000,
    old_price: 115000,
    ingredients: ['Pepperoni x2', 'Mozzarella', 'Achchiq qalampir', 'Pomidor sousi', 'Rayhon'],
    badges: ['Achchiq', 'Xit'],
    weight_grams: 560,
    kcal: 1340,
    is_bestseller: true,
    sort_order: 3,
  },
  {
    category: 'meat-pizza',
    slug: 'bbq-chicken',
    title: 'BBQ Tovuqli',
    description: "Tutunlangan tovuq go'shti, BBQ sousi, qizil piyoz va cheddar.",
    image_url: `${IMG}photo-1565299624946-b28f40a0ae38${q}`,
    price: 85000,
    old_price: null,
    ingredients: ["Tovuq go'shti", 'BBQ sous', 'Qizil piyoz', 'Cheddar', 'Mozzarella'],
    badges: ['Yangi'],
    weight_grams: 540,
    kcal: 1210,
    sort_order: 4,
  },
  {
    category: 'meat-pizza',
    slug: 'meat-lovers',
    title: "Besh go'shtli",
    description: "Pepperoni, bekon, kolbasa, mol go'shti va vetchina — bir pitssada.",
    image_url: `${IMG}photo-1534308983496-4fabb1a015ee${q}`,
    price: 105000,
    old_price: 129000,
    ingredients: ['Pepperoni', 'Bekon', 'Kolbasa', "Mol go'shti", 'Vetchina', 'Mozzarella'],
    badges: ['Premium'],
    weight_grams: 620,
    kcal: 1560,
    is_bestseller: true,
    sort_order: 5,
  },
  {
    category: 'veggie-pizza',
    slug: 'garden-veggie',
    title: 'Sabzavotli',
    description: "Yangi qalampir, zaytun, pomidor, makkajo'xori va qo'ziqorin.",
    image_url: `${IMG}photo-1552539618-7eec9b4d1796${q}`,
    price: 69000,
    old_price: 85000,
    ingredients: [
      "Bulg'or qalampiri",
      "Qo'ziqorin",
      'Qora zaytun',
      'Pomidor',
      "Makkajo'xori",
      'Mozzarella',
    ],
    badges: ['Vegetarian'],
    weight_grams: 500,
    kcal: 890,
    sort_order: 6,
  },
  {
    category: 'veggie-pizza',
    slug: 'truffle-mushroom',
    title: "Qo'ziqorinli",
    description: "Uch xil qo'ziqorin, tryufel kremi va parmezan qirindilari.",
    image_url: `${IMG}photo-1590947132387-155cc02f3212${q}`,
    price: 99000,
    old_price: null,
    ingredients: ['Tryufel kremi', 'Shampinyon', 'Portobello', 'Shiitake', 'Parmezan'],
    badges: ['Premium', 'Yangi'],
    weight_grams: 510,
    kcal: 1020,
    sort_order: 7,
  },
  {
    category: 'drinks',
    slug: 'cola-05',
    title: 'Coca-Cola 0.5 l',
    description: 'Muzdek gazlangan ichimlik.',
    image_url: `${IMG}photo-1554866585-cd94860890b7${q}`,
    price: 12000,
    old_price: 15000,
    ingredients: ['0.5 litr', 'Muzdek'],
    badges: [],
    sort_order: 8,
  },
  {
    category: 'drinks',
    slug: 'fresh-orange',
    title: 'Apelsin fresh 0.4 l',
    description: 'Yangi siqilgan apelsin sharbati, shakarsiz.',
    image_url: `${IMG}photo-1613478223719-2ab802602423${q}`,
    price: 22000,
    old_price: null,
    ingredients: ['100% apelsin', 'Shakarsiz'],
    badges: ['Yangi siqilgan'],
    sort_order: 9,
  },
  {
    category: 'sides',
    slug: 'garlic-bread',
    title: 'Sarimsoqli non',
    description: "Issiq pechda yopilgan, sarimsoqli sariyog' bilan.",
    image_url: `${IMG}photo-1549931319-a545dcf3bc73${q}`,
    price: 25000,
    old_price: 32000,
    ingredients: ['Sarimsoq', "Sariyog'", 'Petrushka'],
    badges: [],
    sort_order: 10,
  },
  // ── Order Bump (cross-sell) mahsuloti ───────────────────────
  {
    category: 'sides',
    slug: 'cheese-sauce',
    title: 'Pishloqli sous',
    description: "Issiq cheddar sousi — pitssani yanada mazali qiladi.",
    image_url: `${IMG}photo-1631452180519-c014fe946bc7${q}`,
    price: 12000,
    old_price: 20000,
    ingredients: ['Cheddar', 'Qaymoq', 'Ziravorlar'],
    badges: ['Tavsiya'],
    is_addon: true,
    sort_order: 11,
  },
];

const STORIES = [
  {
    title: '-23% Pepperoni',
    cover_url: `${IMG}photo-1628840042765-356cda07504e?auto=format&fit=crop&w=200&q=70`,
    image_url: `${IMG}photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1200&q=80`,
    body: "Faqat bugun! Achchiq Pepperoni — 115 000 so'm o'rniga 89 000 so'm. Aksiya yarim tunda tugaydi.",
    cta_label: 'Buyurtma berish',
    cta_target: '/catalog',
    accent: '#E02B20',
    sort_order: 1,
  },
  {
    title: '30 daqiqa',
    cover_url: `${IMG}photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=70`,
    image_url: `${IMG}photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80`,
    body: "30 daqiqada yetkazib bermasak — keyingi buyurtmangiz biz hisobimizdan.",
    cta_label: 'Katalogni ochish',
    cta_target: '/catalog',
    accent: '#F5A623',
    sort_order: 2,
  },
  {
    title: 'Sharhlar',
    cover_url: `${IMG}photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=200&q=70`,
    image_url: `${IMG}photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=1200&q=80`,
    body: '"Shahardagi eng mazali pitssa. Xamiri yupqa, pishlog\'i cho\'ziladi!" — Aziza R. ⭐️⭐️⭐️⭐️⭐️',
    cta_label: "Menyuni ko'rish",
    cta_target: '/catalog',
    accent: '#2FA84F',
    sort_order: 3,
  },
  {
    title: 'Yangi menyu',
    cover_url: `${IMG}photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=200&q=70`,
    image_url: `${IMG}photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1200&q=80`,
    body: "Qo'ziqorinli va Sabzavotli — yangi mavsumiy ta'mlar allaqachon menyuda.",
    cta_label: "Sinab ko'rish",
    cta_target: '/catalog',
    accent: '#5856D6',
    sort_order: 4,
  },
];

async function main() {
  await db.healthCheck();

  await db.transaction(async (client) => {
    // 1) Kategoriyalar
    for (const c of CATEGORIES) {
      await client.query(
        `INSERT INTO categories (slug, title, emoji, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE
           SET title = EXCLUDED.title, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order`,
        [c.slug, c.title, c.emoji, c.sort_order]
      );
    }

    // 2) Mahsulotlar
    for (const p of PRODUCTS) {
      await client.query(
        `INSERT INTO products
           (category_id, slug, title, description, image_url, price, old_price,
            ingredients, badges, weight_grams, kcal, is_bestseller, is_addon, sort_order)
         VALUES
           ((SELECT id FROM categories WHERE slug = $1), $2, $3, $4, $5, $6, $7,
            $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14)
         ON CONFLICT (slug) DO UPDATE SET
           category_id   = EXCLUDED.category_id,
           title         = EXCLUDED.title,
           description   = EXCLUDED.description,
           image_url     = EXCLUDED.image_url,
           price         = EXCLUDED.price,
           old_price     = EXCLUDED.old_price,
           ingredients   = EXCLUDED.ingredients,
           badges        = EXCLUDED.badges,
           weight_grams  = EXCLUDED.weight_grams,
           kcal          = EXCLUDED.kcal,
           is_bestseller = EXCLUDED.is_bestseller,
           is_addon      = EXCLUDED.is_addon,
           sort_order    = EXCLUDED.sort_order`,
        [
          p.category,
          p.slug,
          p.title,
          p.description,
          p.image_url,
          p.price,
          p.old_price ?? null,
          JSON.stringify(p.ingredients || []),
          JSON.stringify(p.badges || []),
          p.weight_grams ?? null,
          p.kcal ?? null,
          Boolean(p.is_bestseller),
          Boolean(p.is_addon),
          p.sort_order ?? 0,
        ]
      );
    }

    // 3) Storis — har safar toza holatga keltiriladi
    await client.query('TRUNCATE stories RESTART IDENTITY');
    for (const s of STORIES) {
      await client.query(
        `INSERT INTO stories (title, cover_url, image_url, body, cta_label, cta_target, accent, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.title, s.cover_url, s.image_url, s.body, s.cta_label, s.cta_target, s.accent, s.sort_order]
      );
    }
  });

  const stats = await db.one(
    `SELECT
       (SELECT COUNT(*) FROM categories) AS categories,
       (SELECT COUNT(*) FROM products)   AS products,
       (SELECT COUNT(*) FROM stories)    AS stories`
  );

  logger.info('Seed yakunlandi', stats);
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error('Seed muvaffaqiyatsiz', err);
    await db.close().catch(() => {});
    process.exit(1);
  });
