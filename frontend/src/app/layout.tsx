import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { TelegramProvider } from '@/providers/TelegramProvider';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Onboarding } from '@/components/features/Onboarding';
import { Splash } from '@/components/ui/Splash';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Pizza Hub — 30 daqiqada yetkazib beramiz',
  description:
    'Telegram Mini App orqali issiq pitssa buyurtma qiling. Tanlang, buyurtma bering, mazza qiling!',
  applicationName: 'Pizza Hub',
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF6F0' },
    { media: '(prefers-color-scheme: dark)', color: '#161210' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        {/*
          Telegram WebApp SDK — React hydration'dan OLDIN yuklanishi shart,
          aks holda `window.Telegram` topilmay, initData bo'sh qoladi.
        */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <TelegramProvider>
          <div id="app-root" className="mx-auto flex min-h-dvh max-w-lg flex-col">
            {/* Pastdagi navigatsiya kontentni yopmasligi uchun joy qoldiramiz */}
            <main className="flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
              {children}
            </main>
          </div>

          <BottomNavigation />
          <Onboarding />
          <Splash />
        </TelegramProvider>
      </body>
    </html>
  );
}
