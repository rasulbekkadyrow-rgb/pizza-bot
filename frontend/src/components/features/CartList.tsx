'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Price, OldPrice } from '@/components/ui/Price';
import type { CartLine } from '@/lib/types';

/**
 * «Order Stack» — savatdagi mahsulotlar ro'yxati.
 * Har bir qator: rasm, nom, narx va miqdor boshqaruvi (+/−).
 * Miqdor 1 dan kamaysa — qator silliq animatsiya bilan o'chadi.
 */

export function CartList({ lines }: { lines: CartLine[] }) {
  const cart = useCart();

  return (
    <ul className="space-y-2.5">
      <AnimatePresence initial={false} mode="popLayout">
        {lines.map((line) => (
          <motion.li
            key={line.productId}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.9, transition: { duration: 0.22 } }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="flex gap-3 rounded-3xl bg-surface p-2.5 shadow-card"
          >
            {/* Rasm */}
            <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-2xl bg-line/40">
              <Image
                src={line.imageUrl}
                alt={line.title}
                fill
                sizes="74px"
                className="object-cover"
              />
            </div>

            {/* Ma'lumot */}
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 pr-1 text-[14px] font-bold leading-tight text-ink">
                  {line.title}
                </h3>
                <button
                  type="button"
                  onClick={() => cart.remove(line.productId)}
                  aria-label="O‘chirish"
                  className="press -mr-0.5 -mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted"
                >
                  <Trash2 className="h-[15px] w-[15px]" strokeWidth={2.2} />
                </button>
              </div>

              <div className="flex items-end justify-between gap-2">
                <div>
                  {line.oldPrice && (
                    <OldPrice
                      amount={line.oldPrice * line.quantity}
                      className="block text-[11px] text-muted"
                    />
                  )}
                  <Price
                    amount={line.unitPrice * line.quantity}
                    className="block text-[17px] font-extrabold leading-none text-ink"
                  />
                </div>

                {/* Miqdor */}
                <div className="flex h-8 items-center gap-0.5 rounded-2xl bg-line/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => cart.decrement(line.productId)}
                    aria-label="Kamaytirish"
                    className="grid h-7 w-7 place-items-center rounded-xl text-ink active:scale-90"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <span className="min-w-[20px] text-center text-[13px] font-extrabold text-ink">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => cart.increment(line.productId)}
                    aria-label="Ko‘paytirish"
                    className="grid h-7 w-7 place-items-center rounded-xl bg-brand-500 text-white active:scale-90"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
