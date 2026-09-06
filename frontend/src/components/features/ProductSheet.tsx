'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Minus, Plus, ShieldCheck, Leaf, Timer } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';
import { Price, OldPrice } from '@/components/ui/Price';
import type { Product } from '@/lib/types';

/**
 * Mahsulot tafsilotlari — pastdan qalqib chiquvchi Bottom Sheet.
 * Pastida yopishib turuvchi (sticky) CTA: «Savatchaga qo'shish — $XX».
 */

const GUARANTEES = [
  { Icon: ShieldCheck, label: '100% sifat kafolati' },
  { Icon: Leaf, label: 'Faqat yangi mahsulotlar' },
  { Icon: Timer, label: '30 daqiqada yetkazish' },
];

export function ProductSheet({
  product,
  isOpen,
  onClose,
}: {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);

  // Har safar yangi mahsulot ochilganda miqdorni tiklash
  useEffect(() => {
    if (isOpen && product) setQuantity(Math.max(cart.quantityOf(product.id), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id]);

  if (!product) return null;

  const total = product.price * quantity;
  const hasDiscount = product.discountPercent > 0;

  const handleAdd = () => {
    // Savatdagi miqdorni to'g'ridan-to'g'ri o'rnatamiz (qo'shib yubormaymiz)
    if (cart.has(product.id)) cart.setQuantity(product.id, quantity);
    else cart.add(product, quantity);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showHandle
      showCloseButton={false}
      footer={
        <div className="pb-1">
          {/* Miqdor + CTA */}
          <div className="flex items-center gap-3">
            <div className="flex h-14 items-center gap-1 rounded-2xl bg-line/50 px-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Kamaytirish"
                className="grid h-12 w-11 place-items-center rounded-xl text-ink active:scale-90 disabled:opacity-35"
                disabled={quantity <= 1}
              >
                <Minus className="h-[18px] w-[18px]" strokeWidth={3} />
              </button>
              <span className="min-w-[24px] text-center text-[17px] font-extrabold text-ink">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                aria-label="Ko‘paytirish"
                className="grid h-12 w-11 place-items-center rounded-xl text-ink active:scale-90"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
              </button>
            </div>

            <Button size="lg" fullWidth onClick={handleAdd} className="flex-1">
              Savatga · <Price amount={total} className="ml-1" />
            </Button>
          </div>
        </div>
      }
    >
      {/* Media */}
      <div className="relative mx-4 mt-1 aspect-[16/11] overflow-hidden rounded-3xl bg-line/40">
        {product.videoUrl ? (
          <video
            src={product.videoUrl}
            poster={product.imageUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            priority
            className="object-cover"
          />
        )}

        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-500 px-2.5 py-1.5 text-[12px] font-extrabold text-white shadow">
            −{product.discountPercent}% chegirma
          </span>
        )}
      </div>

      <div className="px-5 pb-5 pt-4">
        {/* Nishonlar */}
        {product.badges.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {product.badges.map((badge) => (
              <span
                key={badge}
                className="flex items-center gap-1 rounded-full bg-gold-500/12 px-2.5 py-1 text-[11px] font-bold text-gold-500"
              >
                <Flame className="h-3 w-3" strokeWidth={2.5} />
                {badge}
              </span>
            ))}
          </div>
        )}

        <h2 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink">
          {product.title}
        </h2>

        {/* Narx */}
        <div className="mt-2 flex items-baseline gap-2.5">
          <Price
            amount={product.price}
            className={cn(
              'text-[26px] font-extrabold tracking-tight',
              hasDiscount ? 'text-brand-500' : 'text-ink'
            )}
          />
          {product.oldPrice && (
            <OldPrice amount={product.oldPrice} className="text-[15px] font-semibold text-muted" />
          )}
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-muted">{product.description}</p>

        {/* Og'irlik / kaloriya */}
        {(product.weightGrams || product.kcal) && (
          <div className="mt-4 flex gap-2.5">
            {product.weightGrams && (
              <div className="flex-1 rounded-2xl bg-surface px-3.5 py-2.5 text-center">
                <p className="text-[17px] font-extrabold text-ink">{product.weightGrams} g</p>
                <p className="text-[11px] font-medium text-muted">Og‘irligi</p>
              </div>
            )}
            {product.kcal && (
              <div className="flex-1 rounded-2xl bg-surface px-3.5 py-2.5 text-center">
                <p className="text-[17px] font-extrabold text-ink">{product.kcal} kkal</p>
                <p className="text-[11px] font-medium text-muted">Energiya</p>
              </div>
            )}
          </div>
        )}

        {/* Tarkibi */}
        {product.ingredients.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-muted">
              Tarkibi
            </h3>
            <ul className="space-y-2">
              {product.ingredients.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  className="flex items-center gap-2.5 text-[15px] text-ink"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15">
                    <Check className="h-3 w-3 text-success" strokeWidth={3.5} />
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        {/* Kafolatlar */}
        <section className="mt-5 space-y-2 rounded-3xl bg-surface p-4">
          {GUARANTEES.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-success/12">
                <Icon className="h-[18px] w-[18px] text-success" strokeWidth={2.4} />
              </span>
              <span className="text-[14px] font-semibold text-ink">{label}</span>
            </div>
          ))}
        </section>
      </div>
    </BottomSheet>
  );
}
