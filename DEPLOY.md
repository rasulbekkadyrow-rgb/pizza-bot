# 🚀 Vercel'ga deploy qilish

Ikkita Vercel loyihasi yaratiladi (bitta repodan):

| Loyiha | Root papka | Nima |
|---|---|---|
| `pizza-api` | `backend` | Express + Telegraf, serverless funksiya |
| `pizza-app` | `frontend` | Next.js Mini App |

Frontend API'ni **o'zi orqali uzatadi** (`next.config.mjs` → rewrites), shuning uchun
brauzer faqat bitta domen bilan ishlaydi va CORS muammosi yo'q.

---

## Muhim: Vercel serverless

Vercel'da **doimiy jarayon yo'q**, shuning uchun:

- ❌ Long polling ishlamaydi
- ✅ Bot **webhook** rejimida ishlaydi (`/api/bot/webhook/<WEBHOOK_SECRET>`)
- ⚠️ Telegram sozlamalari avtomatik emas — deploy'dan keyin bir marta
  `npm run telegram:setup` chaqiriladi
- ⚠️ DB heartbeat va warm-up o'chiriladi (`VERCEL` o'zgaruvchisi bo'yicha avtomatik)

---

## 1-qadam. Kirish

```bash
npx vercel login
```

Brauzer ochiladi — Vercel akkauntingizga kiring.

## 2-qadam. Backend

```bash
cd backend
npx vercel --prod
```

Savollarga javob: *Set up and deploy* → **Yes**, loyiha nomi → `pizza-api`,
root directory → `./` (siz allaqachon `backend` ichidasiz).

Deploy tugagach manzilni eslab qoling, masalan `https://pizza-api.vercel.app`.

### Backend uchun muhit o'zgaruvchilari

Vercel dashboard → loyiha → *Settings* → *Environment Variables* (yoki CLI orqali):

```bash
npx vercel env add BOT_TOKEN production
npx vercel env add DATABASE_URL production
npx vercel env add ADMIN_CHAT_IDS production
npx vercel env add WEBHOOK_SECRET production
npx vercel env add WEBAPP_URL production      # frontend manzili (3-qadamdan)
npx vercel env add PUBLIC_URL production      # SHU backend manzili
```

To'liq ro'yxat — [`backend/.env.example`](backend/.env.example). Ishlab chiqarish uchun:

| O'zgaruvchi | Qiymat |
|---|---|
| `NODE_ENV` | `production` |
| `BOT_TOKEN` | @BotFather'dan |
| `DATABASE_URL` | Neon connection string |
| `ADMIN_CHAT_IDS` | Sizning Telegram ID (vergul bilan bir nechta) |
| `WEBHOOK_SECRET` | Uzun tasodifiy satr — webhook manzilini himoya qiladi |
| `PUBLIC_URL` | `https://pizza-api.vercel.app` |
| `WEBAPP_URL` | `https://pizza-app.vercel.app` |
| `ADMIN_SETUP_DISABLED` | `true` (kod orqali admin bo'lishni yopish) |
| `DEBUG_INIT_DATA` | qo'ymang / `false` |

O'zgaruvchilarni qo'shgach qayta deploy qiling: `npx vercel --prod`

## 3-qadam. Frontend

```bash
cd ../frontend
npx vercel --prod
```

Loyiha nomi → `pizza-app`.

### Frontend uchun muhit o'zgaruvchilari

| O'zgaruvchi | Qiymat |
|---|---|
| `BACKEND_URL` | `https://pizza-api.vercel.app` |
| `NEXT_PUBLIC_BRAND_NAME` | `Pizza Hub` |
| `NEXT_PUBLIC_SUPPORT_USERNAME` | operator username'i |

> ⚠️ `BACKEND_URL` **build paytida** o'qiladi (rewrites shu paytda hosil bo'ladi).
> Uni o'zgartirgach — albatta qayta deploy qiling.

## 4-qadam. Telegram'ni sozlash

Backend manzilini `PUBLIC_URL` ga, frontend manzilini `WEBAPP_URL` ga yozganingizdan keyin:

```bash
cd backend
PUBLIC_URL=https://pizza-api.vercel.app \
WEBAPP_URL=https://pizza-app.vercel.app \
npm run telegram:setup
```

Bu buyruq: buyruqlar menyusi, «Menyu» tugmasi, bot tavsifi va **webhook**ni o'rnatadi.

Tekshirish:

```bash
curl https://pizza-api.vercel.app/health
```

`{"ok":true,...,"runtime":"serverless"}` qaytishi kerak.

## 5-qadam. Baza

Baza allaqachon Neon'da va migratsiya qilingan — qo'shimcha ish kerak emas.
Yangi baza bo'lsa:

```bash
cd backend && npm run db:migrate && npm run db:seed
```

---

## Deploy'dan keyin

1. Botga `/start` yozing — «🍕 Menyu» tugmasi Vercel manzilini ochishi kerak
2. Sinov buyurtmasi bering — admin chatiga kartochka tushadi
3. Lokal `npm start` va avtomatik ishga tushirishni o'chiring:
   ```bash
   npm run autostart:off
   npm stop
   ```
   Vercel'da ishlagach kompyuteringiz kerak emas.

## Cheklovlar

| Nuqta | Izoh |
|---|---|
| Sovuq start | Uzoq ishlatilmasa birinchi so'rov ~1–2 s |
| Katalog keshi | Har bir instansiyada alohida — samarasi kamroq, lekin ishlaydi |
| Neon bepul tarif | 5 daqiqa bo'sh tursa compute uxlaydi → birinchi so'rov sekinroq |
| Fayl saqlash | Vercel'da disk vaqtinchalik — rasm yuklash uchun S3/Cloudinary kerak |

## Domen

Vercel dashboard → *Settings* → *Domains* → o'z domeningizni ulang.
Keyin `WEBAPP_URL` / `PUBLIC_URL` ni yangilab, `npm run telegram:setup` ni qayta chaqiring.
