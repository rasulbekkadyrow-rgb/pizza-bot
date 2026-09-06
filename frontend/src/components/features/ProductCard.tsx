'use client';

import Image from 'next/image';
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Flame } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';
import { Price, OldPrice } from '@/components/ui/Price';
import type { Product } from '@/lib/types';

/**
 * Mahsulot kartochkasi.
 * - Kartochka bosilsa — Bottom Sheet ochiladi (`onOpen`).
 * - ➕ tugmasi — tezkor qo'shish; savatda bo'lsa miqdor boshqaruviga aylanadi.
 */

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
  index?: number;
}

export const ProductCard = memo(function ProductCard({ product, onOpen, index = 0 }: ProductCardProps) {
  const cart = useCart();
  const quantity = cart.quantityOf(product.id);
  const hasDiscount = product.discountPercent > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.32), type: 'spring', damping: 24, stiffness: 260 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-surface shadow-card"
    >
      {/* Rasm */}
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative aspect-[4/3.4] w-full overflow-hidden bg-line/40"
        aria-label={`${product.title} — batafsil`}
      >
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, 240px"
          className="object-cover transition-transform duration-500 ease-ios group-active:scale-105"
        />

        {/* Chegirma lentasi */}
        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand-500 px-2 py-1 text-[11px] font-extrabold text-white shadow-sm">
            −{product.discountPercent}%
          </span>
        )}

        {/* Bestseller belgisi */}
        {product.isBestseller && (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
            <Flame className="h-3 w-3 text-gold-400" strokeWidth={2.5} />
            XIT
          </span>
        )}
      </button>

      {/* Matn */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <button type="button" onClick={() => onOpen(product)} className="text-left">
          <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight text-ink">
            {product.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 min-h-[2.1rem] text-[12px] leading-snug text-muted">
            {product.description}
          </p>
        </button>

        {/* Narx + miqdor: ikkalasi ham ikki ustunli tarmoqqa sig'ishi kerak,
            shuning uchun matn qisqaradi, boshqaruv esa qisilmaydi (shrink-0). */}
        <div className="mt-2.5 flex items-end justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            {product.oldPrice && (
              <OldPrice amount={product.oldPrice} className="block text-[11px] font-medium text-muted" />
            )}
            <Price
              amount={product.price}
              className={cn(
                'block text-[18px] font-extrabold leading-none tracking-tight',
                hasDiscount ? 'text-brand-500' : 'text-ink'
              )}
            />
          </div>

          {/* Savatda yo'q bo'lsa — tezkor ➕ tugmasi shu qatorda */}
          <AnimatePresence initial={false}>
            {quantity === 0 && (
              <motion.button
                key="add"
                type="button"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                onClick={() => cart.add(product)}
                aria-label="Savatchaga qo‘shish"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-cta active:scale-90"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Savatda bor bo'lsa — miqdor butun kenglikda alohida qatorda:
            ikki ustunli tarmoqda narx bilan urishmasligi uchun. */}
        <AnimatePresence initial={false}>
          {quantity > 0 && (
            <motion.div
              key="qty"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 36, marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              className="flex w-full items-center justify-between overflow-hidden rounded-2xl bg-brand-500/10 p-0.5"
            >
              <button
                type="button"
                onClick={() => cart.decrement(product.id)}
                aria-label="Kamaytirish"
                className="grid h-8 w-9 place-items-center rounded-[13px] text-brand-500 active:scale-90"
              >
                <Minus className="h-4 w-4" strokeWidth={3} />
              </button>
              <span className="text-[14px] font-extrabold text-brand-500">{quantity}</span>
              <button
                type="button"
                onClick={() => cart.increment(product.id)}
                aria-label="Ko‘paytirish"
                className="grid h-8 w-9 place-items-center rounded-[13px] bg-brand-500 text-white active:scale-90"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
});

/** Yuklanish holati uchun skelet. */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-surface shadow-card">
      <div className="skeleton aspect-[4/3.4] w-full" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-3.5 w-3/4 rounded-full" />
        <div className="skeleton h-2.5 w-full rounded-full" />
        <div className="skeleton h-2.5 w-2/3 rounded-full" />
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-9 w-9 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
