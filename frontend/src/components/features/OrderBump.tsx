'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { SwitchTrack } from '@/components/ui/Input';
import { Price, OldPrice } from '@/components/ui/Price';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

/**
 * Order Bump (cross-sell) — savatdagi bitta bosishlik qo'shimcha taklif.
 *
 * MUHIM detallar:
 *  • BUTUN kartochka bosiladi, faqat tugmagina emas — mijozlar odatda
 *    matnni bosishadi. Switch esa `pointer-events-none`: aks holda bosish
 *    ikki marta hisoblanib, holat o'z-o'zidan qaytib qolardi.
 *  • `layout` animatsiyasi ishlatilmaydi — savat ro'yxati o'zgarganda
 *    kartochka sakrab ketardi. O'rniga faqat rang va belgi animatsiyasi.
 */

export function OrderBump({ addon }: { addon: Product | undefined }) {
  const cart = useCart();
  if (!addon) return null;

  const isOn = cart.has(addon.id);

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={`${addon.title} qo‘shish`}
      onClick={() => cart.toggle(addon)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'relative block w-full overflow-hidden rounded-3xl border-2 border-dashed p-3.5 text-left',
        'transition-colors duration-300',
        isOn ? 'border-success/60 bg-success/10' : 'border-amber-500/50 bg-amber-500/10'
      )}
    >
      {/* Sarlavha */}
      <div className="mb-2.5 flex items-center gap-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isOn ? 'on' : 'off'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5"
          >
            {isOn ? (
              <Check className="h-4 w-4 text-success" strokeWidth={3} />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-600" strokeWidth={2.6} />
            )}
            <span
              className={cn(
                'text-[11px] font-extrabold uppercase tracking-wide',
                isOn ? 'text-success' : 'text-amber-600'
              )}
            >
              {isOn ? 'Savatga qo‘shildi' : 'Maxsus taklif'}
            </span>
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-line/40">
          <Image src={addon.imageUrl} alt="" fill sizes="56px" className="object-cover" />
        </div>

        {/* Matn — ikki qatordan oshmaydi, tugmani siqib qo'ymaydi */}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-snug text-ink">
            <Price amount={addon.price} className="text-brand-500" /> ga{' '}
            {addon.title.toLowerCase()} qo‘shamizmi?
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            {addon.oldPrice && <OldPrice amount={addon.oldPrice} className="shrink-0" />}
            <span className="truncate">{addon.description}</span>
          </p>
        </div>

        {/* Faqat vizual: bosishni tashqi tugma qabul qiladi.
            Ichma-ich <button> qo'yish yaroqsiz HTML bo'lardi. */}
        <SwitchTrack checked={isOn} />
      </div>
    </motion.button>
  );
}
