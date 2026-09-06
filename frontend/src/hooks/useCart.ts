'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCartStore, selectCount, selectSubtotal } from '@/store/cartStore';
import { useCatalog } from './useCatalog';
import { useTelegram } from './useTelegram';
import type { Product } from '@/lib/types';

/**
 * Savat bilan ishlashning yagona interfeysi:
 * holat + narx hisob-kitobi + haptik javob.
 *
 * Hydration muammosi: localStorage'dagi savat faqat mijoz tomonida mavjud,
 * shuning uchun SSR paytida 0 ko'rsatiladi (`isHydrated`).
 */
export function useCart() {
  const lines = useCartStore((s) => s.lines);
  const draft = useCartStore((s) => s.draft);
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);

  const add = useCartStore((s) => s.add);
  const remove = useCartStore((s) => s.remove);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const toggle = useCartStore((s) => s.toggle);
  const clear = useCartStore((s) => s.clear);
  const updateDraft = useCartStore((s) => s.updateDraft);

  const { settings } = useCatalog();
  const { haptic } = useTelegram();

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const totals = useMemo(() => {
    const isFreeDelivery = subtotal >= settings.freeDeliveryFrom;
    const deliveryFee = subtotal === 0 || isFreeDelivery ? 0 : settings.deliveryFee;

    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      isFreeDelivery,
      /** Bepul yetkazishgacha qancha qoldi (0 bo'lsa — allaqachon bepul) */
      remainingForFree: Math.max(settings.freeDeliveryFrom - subtotal, 0),
    };
  }, [subtotal, settings]);

  return {
    lines,
    draft,
    count: isHydrated ? count : 0,
    isHydrated,
    isEmpty: lines.length === 0,
    settings,
    ...totals,

    quantityOf: (productId: number) => lines.find((l) => l.productId === productId)?.quantity ?? 0,
    has: (productId: number) => lines.some((l) => l.productId === productId),

    add: (product: Product, qty = 1) => {
      add(product, qty);
      haptic('medium');
    },
    increment: (id: number) => {
      increment(id);
      haptic('light');
    },
    decrement: (id: number) => {
      decrement(id);
      haptic('light');
    },
    toggle: (product: Product) => {
      toggle(product);
      haptic('selection');
    },
    remove: (id: number) => {
      remove(id);
      haptic('warning');
    },
    setQuantity,
    clear,
    updateDraft,

    /** Backend uchun minimal ko'rinish */
    toPayloadItems: () => lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
  };
}
