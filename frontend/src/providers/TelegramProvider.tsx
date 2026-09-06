'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TelegramUser, TelegramWebApp } from '@/lib/types';

/**
 * Telegram WebApp SDK bilan React o'rtasidagi ko'prik.
 *
 * - SDK skripti `layout.tsx` da `beforeInteractive` bilan yuklanadi;
 *   bu yerda uning tayyor bo'lishini kutamiz (brauzerda ochilsa — fallback rejim).
 * - Tema (light/dark), viewport balandligi va safe-area CSS o'zgaruvchilarga yoziladi.
 */

export interface TelegramContextValue {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  /** SDK tayyor bo'ldi (yoki brauzer fallback rejimi aniqlandi) */
  isReady: boolean;
  /** Haqiqiy Telegram klientida ochilganmi? */
  isTelegram: boolean;
  colorScheme: 'light' | 'dark';
  haptic: (type?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
}

export const TelegramContext = createContext<TelegramContextValue>({
  webApp: null,
  user: null,
  isReady: false,
  isTelegram: false,
  colorScheme: 'light',
  haptic: () => {},
  showAlert: () => {},
  showConfirm: async () => false,
});

/** Brauzerda (Telegramsiz) sinash uchun demo profil. */
const BROWSER_FALLBACK_USER: TelegramUser = {
  id: 0,
  first_name: '',
  language_code: 'uz',
};

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const applyTheme = (app: TelegramWebApp) => {
      const scheme = app.colorScheme === 'dark' ? 'dark' : 'light';
      setColorScheme(scheme);
      document.documentElement.dataset.theme = scheme;
    };

    const applyViewport = (app: TelegramWebApp) => {
      const root = document.documentElement;
      root.style.setProperty('--tg-viewport-height', `${app.viewportHeight}px`);
      root.style.setProperty('--tg-viewport-stable-height', `${app.viewportStableHeight}px`);
    };

    const boot = () => {
      const app = window.Telegram?.WebApp;

      if (!app) {
        // Telegram yo'q — brauzer rejimi. 20 marta (≈2s) kutib ko'ramiz.
        if (attempts++ < 20) {
          setTimeout(boot, 100);
          return;
        }
        if (!cancelled) {
          document.documentElement.dataset.theme =
            window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          setIsReady(true);
        }
        return;
      }

      app.ready();
      app.expand();
      app.disableVerticalSwipes?.();
      app.enableClosingConfirmation();

      applyTheme(app);
      applyViewport(app);

      // Header rangini brend rangiga moslash
      try {
        app.setHeaderColor(app.themeParams.secondary_bg_color || '#F4F4F7');
      } catch {
        /* eski klientlarda mavjud emas */
      }

      if (!cancelled) {
        setWebApp(app);
        setIsReady(true);
      }
    };

    boot();

    // Telegram hodisalari
    const onTheme = () => {
      const app = window.Telegram?.WebApp;
      if (app) applyTheme(app);
    };
    const onViewport = () => {
      const app = window.Telegram?.WebApp;
      if (app) applyViewport(app);
    };

    window.addEventListener('themeChanged', onTheme);
    window.addEventListener('viewportChanged', onViewport);

    return () => {
      cancelled = true;
      window.removeEventListener('themeChanged', onTheme);
      window.removeEventListener('viewportChanged', onViewport);
    };
  }, []);

  const haptic = useCallback<TelegramContextValue['haptic']>(
    (type = 'light') => {
      const hf = webApp?.HapticFeedback;
      if (!hf) return;
      try {
        if (type === 'success' || type === 'error' || type === 'warning') {
          hf.notificationOccurred(type);
        } else if (type === 'selection') {
          hf.selectionChanged();
        } else {
          hf.impactOccurred(type);
        }
      } catch {
        /* qo'llab-quvvatlanmaydi */
      }
    },
    [webApp]
  );

  const showAlert = useCallback(
    (message: string) => {
      if (webApp?.showAlert) webApp.showAlert(message);
      else window.alert(message);
    },
    [webApp]
  );

  const showConfirm = useCallback(
    (message: string) =>
      new Promise<boolean>((resolve) => {
        if (webApp?.showConfirm) webApp.showConfirm(message, resolve);
        else resolve(window.confirm(message));
      }),
    [webApp]
  );

  const value = useMemo<TelegramContextValue>(
    () => ({
      webApp,
      user: webApp?.initDataUnsafe?.user ?? (isReady && !webApp ? BROWSER_FALLBACK_USER : null),
      isReady,
      isTelegram: Boolean(webApp?.initData),
      colorScheme,
      haptic,
      showAlert,
      showConfirm,
    }),
    [webApp, isReady, colorScheme, haptic, showAlert, showConfirm]
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}
