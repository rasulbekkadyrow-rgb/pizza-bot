'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartLine, Product } from '@/lib/types';

/**
 * Savat — yagona global holat (Zustand + localStorage).
 *
 * Narxlar bu yerda faqat KO'RSATISH uchun saqlanadi; yakuniy summa
 * har doim backend'da qayta hisoblanadi (`POST /api/cart/validate`).
 */

export interface CheckoutDraft {
  customerName: string;
  phone: string;
  address: string;
  comment: string;
  paymentMethod: 'CARD' | 'CASH';
}

interface CartState {
  lines: CartLine[];
  draft: CheckoutDraft;
  /** Oxirgi qo'shilgan mahsulot — "qo'shildi" animatsiyasi uchun */
  lastAddedId: number | null;

  add: (product: Product, quantity?: number) => void;
  remove: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  increment: (productId: number) => void;
  decrement: (productId: number) => void;
  toggle: (product: Product) => void;
  clear: () => void;
  updateDraft: (patch: Partial<CheckoutDraft>) => void;
}

const EMPTY_DRAFT: CheckoutDraft = {
  customerName: '',
  phone: '',
  address: '',
  comment: '',
  paymentMethod: 'CARD',
};

function toLine(product: Product, quantity: number): CartLine {
  return {
    productId: product.id,
    slug: product.slug,
    title: product.title,
    imageUrl: product.imageUrl,
    unitPrice: product.price,
    oldPrice: product.oldPrice,
    quantity,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      draft: EMPTY_DRAFT,
      lastAddedId: null,

      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === product.id);
          const lines = existing
            ? state.lines.map((l) =>
                l.productId === product.id
                  ? { ...l, quantity: Math.min(l.quantity + quantity, 50) }
                  : l
              )
            : [...state.lines, toLine(product, quantity)];

          return { lines, lastAddedId: product.id };
        }),

      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId ? { ...l, quantity: Math.min(quantity, 50) } : l
                ),
        })),

      increment: (productId) => get().setQuantity(productId, getQty(get().lines, productId) + 1),
      decrement: (productId) => get().setQuantity(productId, getQty(get().lines, productId) - 1),

      /** Order Bump uchun: yoqilgan bo'lsa o'chiradi, aks holda 1 dona qo'shadi. */
      toggle: (product) => {
        const exists = get().lines.some((l) => l.productId === product.id);
        if (exists) get().remove(product.id);
        else get().add(product, 1);
      },

      clear: () => set({ lines: [], lastAddedId: null }),

      updateDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
    }),
    {
      name: 'pizza-cart-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines, draft: state.draft }),

      /**
       * v2: narxlar dollardan so'mga o'tdi va maydon nomlari o'zgardi
       * (`unitPriceCents` → `unitPrice`). Eski savatni ko'chirishning ma'nosi yo'q —
       * undagi summalar noto'g'ri bo'lardi, shuning uchun u tozalanadi.
       * Foydalanuvchi kiritgan ma'lumotlar (ism, telefon, manzil) esa saqlanadi.
       */
      version: 2,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<CartState> | undefined;
        if (fromVersion < 2) {
          return { lines: [], draft: state?.draft ?? EMPTY_DRAFT };
        }
        return state;
      },
    }
  )
);

function getQty(lines: CartLine[], productId: number): number {
  return lines.find((l) => l.productId === productId)?.quantity ?? 0;
}

// ── Selektorlar (komponentlarda ortiqcha render bo'lmasligi uchun) ──

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
export const selectSubtotal = (s: CartState) =>
  s.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
export const selectQuantityOf = (productId: number) => (s: CartState) =>
  s.lines.find((l) => l.productId === productId)?.quantity ?? 0;
