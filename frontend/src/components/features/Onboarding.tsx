'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Flame, ListOrdered, Users, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/Logo';
import { useTelegram } from '@/hooks/useTelegram';
import { cn } from '@/lib/utils';

/**
 * Onboarding slayderi — faqat BIRINCHI kirishda ko'rsatiladi (localStorage).
 * Swipe (drag), tugmalar va nuqtalar orqali boshqariladi.
 */

const STORAGE_KEY = 'pizza-onboarding-seen-v1';

interface Slide {
  id: string;
  Icon: typeof Flame;
  emoji: string;
  title: string;
  text: string;
  gradient: string;
  steps?: string[];
}

const SLIDES: Slide[] = [
  {
    id: 'hunger',
    Icon: Flame,
    emoji: '🍕',
    title: 'Sizni ochlik qiynayaptimi?',
    text: 'Biz 30 daqiqada issiq pitssani yetkazib beramiz!',
    gradient: 'from-brand-500 to-gold-500',
  },
  {
    id: 'how',
    Icon: ListOrdered,
    emoji: '⚡️',
    title: 'Bu qanday ishlaydi?',
    text: 'Uchta oddiy qadam — va pitssa eshigingizda.',
    gradient: 'from-info to-brand-400',
    steps: ['Tanlang', 'Buyurtma bering', 'Mazza qiling'],
  },
  {
    id: 'social',
    Icon: Users,
    emoji: '⭐️',
    title: '10 000+ mamnun mijoz',
    text: 'Bizning katta oilamizga siz ham qo‘shiling!',
    gradient: 'from-success to-info',
  },
  {
    id: 'start',
    Icon: PartyPopper,
    emoji: '🎉',
    title: 'Hammasi tayyor!',
    text: 'Menyuni ochamiz va sevimli pitssangizni tanlaymiz.',
    gradient: 'from-gold-500 to-brand-500',
  },
];

export function Onboarding() {
  const { haptic } = useTelegram();
  const [isVisible, setIsVisible] = useState(false);
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);

  // Faqat mijoz tomonida — SSR mos kelmasligining oldini olish uchun
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setIsVisible(true);
    } catch {
      /* localStorage bloklangan bo'lsa — ko'rsatmaymiz */
    }
  }, []);

  const paginate = useCallback(
    (delta: number) => {
      setPage(([current]) => {
        const next = current + delta;
        if (next < 0 || next >= SLIDES.length) return [current, 0];
        return [next, delta];
      });
      haptic('light');
    },
    [haptic]
  );

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    haptic('success');
    setIsVisible(false);
  }, [haptic]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const power = info.offset.x + info.velocity.x * 0.25;
    if (power < -120) paginate(1);
    else if (power > 120) paginate(-1);
  };

  if (!isVisible) return null;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding"
        exit={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-0 z-[70] flex flex-col bg-bg"
      >
        {/* Yuqori panel: qadam indikatori + o'tkazib yuborish */}
        <div className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
          <div className="flex gap-1.5">
            {SLIDES.map((s, i) => (
              <motion.span
                key={s.id}
                animate={{ width: i === index ? 22 : 7, opacity: i <= index ? 1 : 0.35 }}
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                className="h-[7px] rounded-full bg-brand-500"
              />
            ))}
          </div>

          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="press text-[14px] font-semibold text-muted"
            >
              O‘tkazib yuborish
            </button>
          )}
        </div>

        {/* Slaydlar */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={slide.id}
              custom={direction}
              initial={{ x: direction >= 0 ? '100%' : '-100%', opacity: 0.4 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction >= 0 ? '-100%' : '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              className="absolute inset-0 flex cursor-grab flex-col items-center justify-center px-8 active:cursor-grabbing"
            >
              {/* Vizual — birinchi slaydda brend logotipi */}
              <div className="relative mb-10">
                <span
                  className={cn(
                    'absolute inset-0 animate-pulse-ring rounded-full bg-gradient-to-br opacity-30',
                    slide.gradient
                  )}
                />
                {slide.id === 'hunger' ? (
                  <LogoMark animated className="relative h-40 w-40 drop-shadow-2xl" />
                ) : (
                  <div
                    className={cn(
                      'relative grid h-40 w-40 place-items-center rounded-[44px] bg-gradient-to-br shadow-float',
                      slide.gradient
                    )}
                  >
                    <span className="text-[64px] leading-none drop-shadow-sm">{slide.emoji}</span>
                  </div>
                )}
              </div>

              <h2 className="text-center text-[28px] font-extrabold leading-[1.15] tracking-tight text-ink">
                {slide.title}
              </h2>
              <p className="mt-3 max-w-[19rem] text-center text-[16px] leading-relaxed text-muted">
                {slide.text}
              </p>

              {/* 2-slayd: qadamlar */}
              {slide.steps && (
                <div className="mt-8 w-full max-w-xs space-y-2.5">
                  {slide.steps.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.1, type: 'spring', damping: 20 }}
                      className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-500 text-[14px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-[15px] font-semibold text-ink">{step}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* 3-slayd: ijtimoiy isbot */}
              {slide.id === 'social' && (
                <div className="mt-8 flex items-center gap-3 rounded-2xl bg-surface px-5 py-3.5 shadow-card">
                  <div className="flex -space-x-2.5">
                    {['🧑', '👩', '🧔', '👵'].map((face, i) => (
                      <span
                        key={i}
                        className="grid h-9 w-9 place-items-center rounded-full bg-elevated text-[18px] ring-2 ring-surface"
                      >
                        {face}
                      </span>
                    ))}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-ink">10 000+</p>
                    <p className="text-[12px] text-muted">⭐️ 4.9 o‘rtacha baho</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pastki boshqaruv */}
        <div className="safe-bottom px-6 pb-4">
          {isLast ? (
            <Button size="lg" fullWidth onClick={finish} className="text-[18px]">
              Boshlash 🚀
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={() => paginate(1)}>
              Keyingisi
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
