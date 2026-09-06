# 🍕 Pizza Hub — Telegram Mini App

Pitssa buyurtma qilish va yetkazib berish tizimi: **Next.js Mini App** + **Node.js/Telegraf bot** + **PostgreSQL (Neon)**.

---

## Arxitektura

```
Mijoz (Telegram Mini App)
        │  POST /api/orders   (Authorization: tma <initData>)
        ▼
Backend (Express + Telegraf)
        ├── PostgreSQL: order → status PENDING
        └── Telegram: adminga inline tugmali kartochka
                 │
     ┌───────────┴────────────┐
     │ ✅ Tasdiqlash & to'lov  │ ❌ Bekor qilish
     ▼                        ▼
 CONFIRMED                CANCELLED
 (mijozga rekvizitlar)
     │  admin to'lovni qo'lda tekshiradi → 💰 To'lov keldi
     ▼
  PAID → PREPARING → DELIVERING → COMPLETED
```

Har bir status o'zgarishi:
1. admin kartochkasini **tahrirlaydi** (yangi status + yangi tugmalar),
2. mijozga avtomatik xabar yuboradi,
3. `order_status_history` jadvaliga yozib qo'yiladi.

---

## Ishga tushirish

Bir marta sozlash:

```bash
npm run setup
```

Keyin — bitta buyruq hamma narsani ko'taradi (tunnel + backend + frontend):

```bash
npm start
```

| Buyruq | Vazifasi |
|---|---|
| `npm start` | Tunnel ochadi, manzilni `.env` ga yozadi, backend va frontend'ni ko'taradi |
| `npm stop` | Hammasini to'xtatadi — server tashqaridan ochiq bo'lmay qoladi |
| `npm run url` | Joriy HTTPS manzilni ko'rsatadi |
| `npm run build` | Frontend'ni qayta quradi (kod o'zgargandan keyin) |
| `npm run autostart:on` | Windows'ga kirganda avtomatik ishga tushsin |
| `npm run autostart:off` | Avtomatik ishga tushishni o'chirish |

### Avtomatik ishga tushish qanday ishlaydi

`autostart:on` foydalanuvchi Startup papkasiga yorliq qo'yadi (administrator huquqi kerak emas).
Kompyuterga kirganingizda `scripts/run-hidden.vbs` oynasiz `node start.js` ni chaqiradi.

Har safar:
1. Cloudflare tunneli ochiladi va **yangi** HTTPS manzil olinadi
2. Manzil `backend/.env` → `WEBAPP_URL` ga yoziladi
3. Backend ko'tariladi va Telegram'dagi menyu tugmasini yangi manzilga **o'zi qayta bog'laydi**
4. Frontend ko'tariladi
5. Biror jarayon yiqilsa — 5 soniyada qayta ko'tariladi

Manzil har safar o'zgarishi muammo emas: ilova API'ni **shu domen ostidan** chaqiradi
(`next.config.mjs` → rewrites), shuning uchun backend manzili kodga yozilmaydi va
qayta qurish (rebuild) talab qilinmaydi.

Loglar: `logs/start.log`, `logs/backend.log`, `logs/frontend.log`, `logs/tunnel.log`

> ⚠️ Avtomatik ishga tushish yoqilgan bo'lsa, kompyuter yoqilgan paytda ilova
> internetdan ochiq bo'ladi. Kerak bo'lmasa `npm run autostart:off` va `npm stop`.

---

## Ishga tushirish (qo'lda, alohida)

### 1. Backend

```bash
cd backend && npm install && npm run db:migrate && npm run db:seed && npm start
```

`.env` ni `.env.example` dan nusxalab to'ldiring: `BOT_TOKEN`, `DATABASE_URL`, `ADMIN_CHAT_IDS`.

Server ishga tushganda logda `Adminlar aniqlandi` chiqishi kerak.
Keyin botga (`@rk_pizza_bot`) **`/start`** yozing — admin menyusi ochiladi.

---

## Adminlar tizimi

Admin ro'yxati ikki manbadan hosil bo'ladi va **ish jarayonida o'zgartirsa bo'ladi**:

| Manba | Qanday qo'shiladi | Bot orqali o'chiriladimi |
|---|---|---|
| `.env` → `ADMIN_CHAT_IDS` | Qo'lda, restart kerak | ❌ yo'q (himoyalangan) |
| Baza → `users.is_admin` | `/admin <kod>` yoki `/addadmin <id>` | ✅ ha, `/deladmin <id>` |

Ro'yxat 15 soniyalik keshda saqlanadi va huquq o'zgarganda darhol yangilanadi
([`models/Admin.js`](backend/src/models/Admin.js)).

### Admin buyruqlari

| Buyruq | Vazifasi |
|---|---|
| `/admin <kod>` | `ADMIN_SETUP_CODE` bilan o'zini admin qilib tayinlash |
| `/panel` | Boshqaruv menyusi + bugungi qisqa hisobot |
| `/pending` | Faol buyurtmalar, har biri o'z tugmalari bilan |
| `/stats` | Bugungi statistika: tushum, o'rtacha chek, statuslar |
| `/admins` | Adminlar ro'yxati (manbasi ko'rsatilgan holda) |
| `/addadmin <id>` · `/deladmin <id>` | Admin qo'shish / olib tashlash |

Bu buyruqlar Telegram menyusida **faqat admin chatida** ko'rinadi (`setMyCommands` + chat scope),
oddiy foydalanuvchi ularni chaqirsa «buyruq mavjud emas» javobini oladi.

> ⚠️ Admin bo'lib olgach `ADMIN_SETUP_CODE` ni o'zgartiring yoki
> `ADMIN_SETUP_DISABLED=true` qiling — aks holda kodni bilgan har kim admin bo'la oladi.

### 2. Frontend

```bash
cd frontend && npm install && npm run dev
```

### 3. Mini App'ni Telegram'ga ulash

Telegram `http://localhost` ni qabul qilmaydi — HTTPS tunnel kerak:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Olingan HTTPS linkni:
- `backend/.env` → `WEBAPP_URL` va `CORS_ORIGINS` ga yozing,
- [@BotFather](https://t.me/BotFather) → `/mybots` → *Bot Settings* → *Menu Button* → shu linkni kiriting.

Backend'ni ham public qilsangiz (`PUBLIC_URL`), bot long polling o'rniga webhook rejimiga o'tadi.

---

## Skriptlar

| Buyruq | Vazifasi |
|---|---|
| `npm run db:migrate` | Sxemani yaratadi (idempotent) |
| `npm run db:migrate -- --force` | Jadvallarni o'chirib, noldan yaratadi |
| `npm run db:seed` | 5 kategoriya, 11 mahsulot, 4 storis |
| `npm run dev` (backend) | `--watch` bilan avto-restart |
| `npm run typecheck` (frontend) | TypeScript tekshiruvi |

---

## API

| Metod | Endpoint | Auth | Tavsif |
|---|---|---|---|
| GET | `/health` | — | Server + DB holati |
| GET | `/api/catalog` | — | Kategoriyalar, mahsulotlar, order-bump |
| GET | `/api/stories` | — | Storis bloki |
| GET | `/api/me` | ✅ | Profil + statistika |
| POST | `/api/cart/validate` | ✅ | Savatni serverda qayta hisoblash |
| POST | `/api/orders` | ✅ | Buyurtma yaratish (limit: 5/min) |
| GET | `/api/orders` | ✅ | Buyurtmalar tarixi |

**Auth** = `Authorization: tma <initData>` sarlavhasi.
Server uni HMAC-SHA256 orqali tekshiradi (`secret = HMAC("WebAppData", BOT_TOKEN)`),
imzo muddati `INIT_DATA_TTL` (default 24 soat).

---

## Tezlik

Baza Neon'ning `us-east-2` mintaqasida — O'zbekistondan bitta so'rov ~150 ms,
sovuq TLS ulanish esa ~2.5 s. Bu bot va ilovaning "qotishi"ga olib kelardi.

| Chora | Fayl | Natija |
|---|---|---|
| Pool ulanishlari yopilmaydi (`idleTimeout=0`, `keepAlive`) | [connection.js](backend/src/database/connection.js) | Qayta ulanish narxi to'lanmaydi |
| Boot'da 3 ta ulanish oldindan ochiladi | `warmUp()` | Birinchi mijoz kutmaydi |
| Katalog 5 daqiqa xotirada, muddati tugagach fonda yangilanadi | [cache.js](backend/src/utils/cache.js) | `/api/catalog`: **3000 ms → 14 ms** |
| `/start` javobi bazaga umuman bog'liq emas | [startController.js](backend/src/controllers/startController.js) | Xabar darhol keladi |

## Start bosilishidan oldingi ekran

Bot tavsifi (`setMyDescription`) va qisqa tavsifi (`setMyShortDescription`)
server ishga tushganda avtomatik o'rnatiladi — foydalanuvchi START ni bosishdan
oldin taklifni o'qiydi.

Tavsif ustidagi **rasm yoki GIF**ni faqat [@BotFather](https://t.me/BotFather) orqali
qo'yish mumkin (`/mybots` → bot → *Edit Bot* → *Edit Description Picture*) —
Bot API'da bunday metod yo'q.

## Xavfsizlik qoidalari

1. **Narxlarga mijozdan ishonilmaydi.** `POST /api/orders` faqat `productId` + `quantity` qabul qiladi,
   summa har doim bazadagi joriy narxlardan qayta hisoblanadi (`cartController.computeCart`).
2. **initData imzosi** timing-safe taqqoslanadi; muddati o'tgan imzo rad etiladi.
3. **Admin amallari** `callback_query` ichida `from.id` bo'yicha qayta tekshiriladi —
   tugmani boshqa odam bosolmaydi.
4. **Status o'tishlari** holat mashinasi bilan cheklangan (`Order.TRANSITIONS`),
   `SELECT ... FOR UPDATE` bilan poyga (race) holatlari to'sib qo'yilgan.
5. **Rate limit** — checkout uchun daqiqasiga 5 ta so'rov.

> ⚠️ Bot tokeni va DB parolingiz chatda ochiq yozilgan edi. Ishlab chiqarishga chiqarishdan oldin
> [@BotFather](https://t.me/BotFather) da tokenni (`/revoke`) va Neon konsolida parolni yangilang.
> `.env` fayllari `.gitignore` da — repozitoriyga tushmaydi.

---

## Fayllar tuzilishi

```
backend/
├── src/
│   ├── config/default.js            env → konfiguratsiya (yagona manba)
│   ├── core/bot.js                  Telegraf yadrosi (send/edit/launch)
│   ├── database/
│   │   ├── connection.js            pg Pool, query/one/many/transaction
│   │   ├── schema.sql               jadvallar, enum, trigger, sequence
│   │   ├── migrate.js / seed.js     skriptlar
│   ├── models/                      User.js · Product.js · Order.js · Admin.js
│   ├── controllers/                 startController · cartController · orderController · adminController
│   ├── routes/                      bot.routes.js · api.routes.js
│   ├── middlewares/auth.middleware.js   initData HMAC tekshiruvi
│   ├── utils/                       keyboards.js · logger.js · format.js
│   └── index.js                     Express + bot bir jarayonda
└── .env

frontend/
├── src/
│   ├── app/                         layout · page · catalog · cart · profile
│   ├── components/
│   │   ├── ui/                      Button · Input/Switch · Modal · BottomSheet · ErrorState
│   │   ├── features/                Onboarding · Stories · ProductCard · ProductSheet
│   │   │                            CartList · OrderBump · HeroWidget · CheckoutSheet · CategoryFilter
│   │   └── layout/                  Header · BottomNavigation
│   ├── hooks/                       useTelegram · useCart · useCatalog
│   ├── lib/                         api.ts · utils.ts · types.ts
│   ├── providers/TelegramProvider.tsx
│   ├── store/cartStore.ts           Zustand + persist
│   └── styles/globals.css           dizayn tokenlari
└── .env.local
```

---

## Dizayn tizimi

Uch referens asosida qurilgan:

| Referens | Natija |
|---|---|
| Qizil doirali skuterli kuryer | [`ui/Logo.tsx`](frontend/src/components/ui/Logo.tsx) — noldan chizilgan SVG. Vektor bo'lgani uchun 32px dan 300px gacha bir xil aniq. Header, splash va bo'sh holatlarda ishlatiladi. |
| Aylanadigan pitssa karuseli | [`features/PizzaCarousel.tsx`](frontend/src/components/features/PizzaCarousel.tsx) — sudrab aylantiriladigan disk, har almashuvda 72° burilish, nom yoy bo'ylab (SVG `textPath`). |
| Amber fon + ulkan «PIZZA» | [`features/BrandBackdrop.tsx`](frontend/src/components/features/BrandBackdrop.tsx) — uch qatlamli tipografika (to'la → konturli → to'la) va yuguruvchi lenta. |

### Pul birligi

Barcha summalar **O'zbekiston so'mida**, butun sonda saqlanadi (tiyin ishlatilmaydi) —
shuning uchun float arifmetikasi va yaxlitlash xatolari umuman yo'q.
Format: `79 000 so'm`. Tor joylarda [`ui/Price.tsx`](frontend/src/components/ui/Price.tsx)
raqamni yirik, "so'm" ni kichik qilib chiqaradi va qatorni hech qachon uzmaydi.

Sozlash: `.env` → `CURRENCY`, `CURRENCY_SYMBOL`, `DELIVERY_FEE`, `FREE_DELIVERY_FROM`.

### Palitra

| Token | Qiymat | Qayerda |
|---|---|---|
| `brand-500` | `#E02B20` | Narx, chegirma, asosiy CTA (logotip qizili) |
| `amber-500` | `#F5A623` | Hero foni, storis halqasi, aksentlar |
| `bg` / `surface` | iliq `#FAF6F0` / oq | Sovuq kulrang o'rniga "xamir" ohangi |

Ranglar CSS o'zgaruvchilari orqali beriladi va Telegram temasiga (light/dark) moslashadi.

> Logotip referens **uslubida** qayta chizilgan, birovning rasmi nusxasi emas —
> shuning uchun uni tijoriy ishlatishda mualliflik huquqi muammosi yo'q.

## UI xususiyatlari

- **Onboarding** — 4 slayd, swipe (drag) bilan, `localStorage` orqali faqat 1 marta.
- **Stories** — Instagram uslubi: progress chiziqlari, tap-navigatsiya, ko'rilganlar xotirasi.
- **Bottom Sheet** — pastga sudrab yopiladi, sticky CTA («Savatchaga qo'shish — $XX»).
- **Order Bump** — toggle switch bilan bir bosishda qo'shimcha sous.
- **Tema** — Telegram `colorScheme` ga qarab light/dark avtomatik almashadi.
- **Haptics** — har bir muhim amalda Telegram tebranishi.
