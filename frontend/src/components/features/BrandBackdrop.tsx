'use client';

import { cn } from '@/lib/utils';

/**
 * Brend foni — amber sirt ustida takrorlanuvchi ulkan «PIZZA» yozuvi.
 *
 * Referens kompozitsiyasi: to'yingan zarg'aldoq fon, uch qatlam tipografika
 * (to'la → konturli → to'la) va burchaklardan "kirib kelayotgan" ingredientlar.
 * Yozuv `aria-hidden` — u dekor, ekran o'quvchi uni o'qimasligi kerak.
 */

export function BrandBackdrop({
  className,
  children,
  word = 'PIZZA',
  wordClassName,
}: {
  className?: string;
  children?: React.ReactNode;
  word?: string;
  /** Tipografik qatlamning joylashuvi/kuchini sozlash (masalan `opacity-40 items-start`). */
  wordClassName?: string;
}) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600',
        className
      )}
    >
      {/* Yumshoq nur — kompozitsiya markazini yoritadi */}
      <span className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/60 blur-3xl" />

      {/* Tipografik qatlam */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 flex flex-col justify-center gap-1',
          'font-extrabold uppercase leading-[0.82] tracking-tight',
          wordClassName
        )}
      >
        <span className="translate-x-2 text-[clamp(3rem,17vw,6rem)] text-white/85">{word}</span>
        <span className="text-outline -translate-x-3 text-[clamp(3rem,17vw,6rem)]">{word}</span>
        <span className="translate-x-6 text-[clamp(3rem,17vw,6rem)] text-white/85">{word}</span>
      </div>

      {/* Burchak aksentlari — ingredient "kesimlari" */}
      <span className="pointer-events-none absolute -left-8 -top-10 -z-10 h-28 w-28 rounded-full border-[10px] border-brand-500/35" />
      <span className="pointer-events-none absolute -right-6 -top-8 -z-10 h-20 w-20 rotate-12 rounded-[28%] bg-brand-500/25" />
      <span className="pointer-events-none absolute -bottom-10 right-8 -z-10 h-24 w-24 rounded-full bg-success/25" />
      <span className="pointer-events-none absolute -bottom-6 -left-6 -z-10 h-16 w-16 rounded-full border-[8px] border-white/30" />

      {children}
    </div>
  );
}

/**
 * Gorizontal yuguruvchi lenta — «PIZZA • 30 MIN • HOT •» .
 * Ikki nusxa ketma-ket qo'yiladi va -50% ga suriladi: uzluksiz halqa hosil bo'ladi.
 */
export function BrandMarquee({ className }: { className?: string }) {
  const items = ['PIZZA', '30 DAQIQA', 'ISSIQ', 'BEPUL YETKAZISH'];
  const strip = [...items, ...items, ...items];

  return (
    <div className={cn('overflow-hidden bg-brand-500 py-2', className)} aria-hidden>
      <div className="flex w-max animate-marquee-x">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {strip.map((label, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center gap-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/90"
              >
                {label}
                <span className="text-amber-300">•</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
