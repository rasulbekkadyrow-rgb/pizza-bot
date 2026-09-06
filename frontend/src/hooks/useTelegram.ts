'use client';

import { useContext, useEffect } from 'react';
import { TelegramContext } from '@/providers/TelegramProvider';

/** Telegram konteksti (webApp, user, haptic, alert…). */
export function useTelegram() {
  return useContext(TelegramContext);
}

/**
 * Telegram'ning tizim "Back" tugmasi.
 * Komponent unmount bo'lganda avtomatik yashiriladi.
 */
export function useBackButton(onBack?: () => void) {
  const { webApp } = useTelegram();

  useEffect(() => {
    const bb = webApp?.BackButton;
    if (!bb || !onBack) return;

    bb.onClick(onBack);
    bb.show();

    return () => {
      bb.offClick(onBack);
      bb.hide();
    };
  }, [webApp, onBack]);
}

/**
 * Telegram'ning pastdagi asosiy tugmasi (MainButton).
 * Savat/checkout sahifalarida native ko'rinish beradi.
 */
export function useMainButton(options: {
  text: string;
  visible: boolean;
  enabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  const { webApp } = useTelegram();
  const { text, visible, enabled = true, loading = false, onClick } = options;

  useEffect(() => {
    const mb = webApp?.MainButton;
    if (!mb) return;

    mb.setParams({ text, is_active: enabled, is_visible: visible });
    if (loading) mb.showProgress(true);
    else mb.hideProgress();

    mb.onClick(onClick);
    return () => {
      mb.offClick(onClick);
      mb.hide();
    };
  }, [webApp, text, visible, enabled, loading, onClick]);
}
