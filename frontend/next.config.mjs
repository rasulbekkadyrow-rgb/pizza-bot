/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

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
