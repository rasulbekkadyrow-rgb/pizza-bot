'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Percent } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

/**
 * Hero CTA yo'lakchasi: «Yangi buyurtma berish» va «Aksiyalarni ko'rish».
 *
 * Karusel bosh sahifaning vizual markazini egallagani uchun bu blok
 * ixchamlashtirildi — u endi katta banner emas, aniq ikkita harakat.
 */

export function HeroWidget() {
  const router = useRouter();
  const { haptic } = useTelegram();

  const go = (href: string) => {
    haptic('medium');
    router.push(href);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="flex gap-2.5"
    >
      <button
        type="button"
        onClick={() => go('/catalog')}
        className="press flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-3.5 text-[14px] font-extrabold text-white shadow-cta"
      >
        Yangi buyurtma
        <ArrowRight className="h-4 w-4" strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={() => go('/catalog?filter=sale')}
        className="press flex items-center justify-center gap-1.5 rounded-2xl bg-surface px-4 py-3.5 text-[14px] font-extrabold text-ink shadow-card"
      >
        <Percent className="h-4 w-4 text-amber-600" strokeWidth={3} />
        Aksiyalar
      </button>
    </motion.div>
  );
}
