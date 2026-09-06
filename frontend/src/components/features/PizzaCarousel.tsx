'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { BrandBackdrop } from './BrandBackdrop';
import { useCart } from '@/hooks/useCart';
import { useTelegram } from '@/hooks/useTelegram';
import { cn } from '@/lib/utils';
import { Price, OldPrice } from '@/components/ui/Price';
import type { Product } from '@/lib/types';

/**
 * Aylanadigan pitssa karuseli — bosh sahifaning asosiy animatsiyasi.
 *
 * - Diskni chapga/o'ngga sudrash (yoki strelkalar) mahsulotni almashtiradi.
 * - Disk har almashuvda 72° aylanadi, rasm esa crossfade + scale bilan almashadi.
 * - Nom pitssa ostida yoy bo'ylab yoziladi (SVG `textPath`).
 *
 * MUHIM: bu yerda faqat ko'rsatiladi va savatga qo'shiladi — narx baribir
 * serverda qayta hisoblanadi, shuning uchun UI hech qachon "yolg'on summa" bermaydi.
 */

const SWIPE_THRESHOLD = 70;

export function PizzaCarousel({
  products,
  onOpen,
}: {
  products: Product[];
  onOpen?: (product: Product) => void;
}) {
  const cart = useCart();
  const { haptic } = useTelegram();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [quantity, setQuantity] = useState(1);

  const paginate = useCallback(
    (delta: number) => {
      if (!products.length) return;
      setDirection(delta);
      setIndex((current) => (current + delta + products.length) % products.length);
      setQuantity(1);
      haptic('selection');
    },
    [products.length, haptic]
  );

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const power = info.offset.x + info.velocity.x * 0.2;
    if (power < -SWIPE_THRESHOLD) paginate(1);
    else if (power > SWIPE_THRESHOLD) paginate(-1);
  };

  if (!products.length) return <CarouselSkeleton />;

  const product = products[index];
  const hasDiscount = product.discountPercent > 0;

  return (
    <BrandBackdrop
      className="rounded-[32px] px-5 pb-6 pt-5 shadow-float"
      // Tipografika faqat yuqori qismda — pastdagi nom va narx bilan urishmasligi uchun
      wordClassName="justify-start pt-9 opacity-30"
    >
      {/* Sarlavha */}
      <div className="relative mb-1 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/75">
            Bugungi tanlov
          </p>
          <h2 className="text-[19px] font-extrabold tracking-tight text-white drop-shadow-sm">
            Aylantiring va tanlang
          </h2>
        </div>

        {hasDiscount && (
          <span className="rounded-full bg-brand-500 px-2.5 py-1.5 text-[12px] font-extrabold text-white shadow">
            −{product.discountPercent}%
          </span>
        )}
      </div>

      {/* Disk */}
      <div className="relative mx-auto mt-3 flex h-[216px] w-[216px] items-center justify-center">
        {/* Issiq nur */}
        <span className="disc-glow pointer-events-none absolute inset-[-12%] rounded-full opacity-70" />

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          onDragEnd={onDragEnd}
          onClick={() => onOpen?.(product)}
          animate={{ rotate: index * 72 }}
          transition={{ type: 'spring', damping: 22, stiffness: 130 }}
          className="relative h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
        >
          {/* Tova (pan) */}
          <span className="absolute inset-0 rounded-full bg-[#2A211C] shadow-disc" />
          <span className="absolute inset-[7px] rounded-full bg-[#3A2E27]" />

          {/* Pitssa rasmi */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.86, rotate: direction * -18 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: direction * 14 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="absolute inset-[12px] overflow-hidden rounded-full ring-4 ring-white/15"
            >
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                sizes="216px"
                priority={index === 0}
                className="select-none object-cover"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Strelkalar */}
        <CarouselArrow side="left" onClick={() => paginate(-1)} />
        <CarouselArrow side="right" onClick={() => paginate(1)} />
      </div>

      {/* Yoy bo'ylab nom */}
      <div className="relative mt-1">
        <svg viewBox="0 0 320 64" className="w-full" aria-hidden>
          <defs>
            <path id="pizza-arc" d="M26,10 Q160,74 294,10" fill="none" />
          </defs>
          <text
            fill="#fff"
            fontSize="22"
            fontWeight="800"
            letterSpacing="0.3"
            stroke="rgb(154 92 4 / 0.35)"
            strokeWidth="4"
            paintOrder="stroke"
          >
            <textPath href="#pizza-arc" startOffset="50%" textAnchor="middle">
              {product.title}
            </textPath>
          </text>
        </svg>
        {/* Ekran o'quvchilar uchun haqiqiy sarlavha */}
        <h3 className="sr-only">{product.title}</h3>
      </div>

      {/* Reyting + narx */}
      <div className="-mt-1 flex flex-col items-center">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-white text-white" strokeWidth={0} />
          ))}
          <span className="ml-1 text-[12px] font-bold text-white/85">4.9</span>
        </div>

        <div className="mt-1.5 flex flex-col items-center">
          <Price
            amount={product.price}
            className="text-[38px] font-black leading-none tracking-tight text-white drop-shadow-sm"
          />
          {product.oldPrice && (
            <OldPrice amount={product.oldPrice} className="mt-1 text-[14px] font-bold text-white/60" />
          )}
        </div>
      </div>

      {/* Boshqaruv: miqdor + savatga */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex h-14 items-center gap-1 rounded-2xl bg-white/20 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Kamaytirish"
            className="grid h-12 w-11 place-items-center rounded-xl text-white active:scale-90 disabled:opacity-40"
          >
            <Minus className="h-[18px] w-[18px]" strokeWidth={3} />
          </button>
          <span className="min-w-[22px] text-center text-[17px] font-extrabold text-white">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            aria-label="Ko‘paytirish"
            className="grid h-12 w-11 place-items-center rounded-xl text-white active:scale-90"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => cart.add(product, quantity)}
          className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2A211C] px-4 text-[15px] font-extrabold text-white shadow-float"
        >
          <ShoppingBag className="h-[18px] w-[18px] shrink-0" strokeWidth={2.6} />
          <span className="whitespace-nowrap">Savatga</span>
        </button>
      </div>

      {/* Nuqtalar */}
      <div className="mt-4 flex justify-center gap-1.5">
        {products.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setDirection(i > index ? 1 : -1);
              setIndex(i);
              setQuantity(1);
              haptic('selection');
            }}
            aria-label={p.title}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300 ease-ios',
              i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45'
            )}
          />
        ))}
      </div>
    </BrandBackdrop>
  );
}

function CarouselArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Oldingi' : 'Keyingi'}
      className={cn(
        'press absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center',
        'rounded-full bg-white/25 text-white backdrop-blur',
        side === 'left' ? '-left-2' : '-right-2'
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={3} />
    </button>
  );
}

function CarouselSkeleton() {
  return (
    <div className="rounded-[32px] bg-amber-500/40 p-5">
      <div className="mx-auto h-[248px] w-[248px] animate-pulse rounded-full bg-white/25" />
      <div className="mx-auto mt-6 h-6 w-40 animate-pulse rounded-full bg-white/25" />
      <div className="mx-auto mt-3 h-10 w-32 animate-pulse rounded-full bg-white/25" />
    </div>
  );
}
