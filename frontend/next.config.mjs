import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Repo ildizida ham, `frontend/` da ham package-lock.json bor.
   * Busiz Next ildizni noto'g'ri tanlab, ogohlantirish beradi va
   * fayllarni kuzatishda (tracing) xatoga yo'l qo'yishi mumkin.
   */
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 't.me' },
      { protocol: 'https', hostname: '**.telegram.org' },
      { protocol: 'https', hostname: '**.cdn.telegram.org' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  /**
   * API'ni SHU domen ostidan uzatamiz (reverse proxy).
   *
   * Nima uchun: ilova brauzerda `/api/...` ga murojaat qiladi va u
   * Next server orqali backend'ga uzatiladi. Natijada:
   *   • bitta tunnel yetadi (ilgari ikkitasi kerak edi),
   *   • CORS umuman kerak emas — manzil bir xil,
   *   • tunnel manzili o'zgarsa ham hech narsa buzilmaydi,
   *     chunki backend manzili qurilish (build) paytida kodga yozilmaydi.
   */
  async rewrites() {
    const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

    // Ishlab chiqarishda BACKEND_URL bo'lmasa, ilova localhost'ga murojaat qilib
    // qoladi va hech narsa yuklanmaydi. Buni build log'ida darhol ko'rsatamiz.
    if (process.env.VERCEL && !process.env.BACKEND_URL) {
      console.warn(
        '\n⚠️  BACKEND_URL o‘rnatilmagan!\n' +
          '   Vercel → Settings → Environment Variables → BACKEND_URL = https://<backend>.vercel.app\n' +
          '   Aks holda API so‘rovlari localhost:4000 ga ketadi va ishlamaydi.\n'
      );
    }

    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Mini App Telegram WebView ichida iframe sifatida ochiladi
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
