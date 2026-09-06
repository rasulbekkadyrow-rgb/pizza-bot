'use client';

import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

/**
 * Gorizontal skroll qilinadigan filtrlar lentasi.
 * «Barchasi» va «Eng ko'p sotilganlar» — virtual filtrlar (bazada kategoriya emas).
 */

export const FILTER_ALL = '__all__';
export const FILTER_BESTSELLERS = '__bestsellers__';

export function CategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const { haptic } = useTelegram();

  const items = [
    { slug: FILTER_ALL, title: 'Barchasi', emoji: '🍽' },
    { slug: FILTER_BESTSELLERS, title: 'Eng ko‘p sotilganlar', emoji: '🔥' },
    ...categories.map((c) => ({ slug: c.slug, title: c.title, emoji: c.emoji ?? '•' })),
  ];

  return (
    <div className="no-scrollbar snap-row -mx-5 flex gap-2 overflow-x-auto px-5 py-1">
      {items.map((item) => {
        const isActive = value === item.slug;
        return (
          <button
            key={item.slug}
            type="button"
            onClick={() => {
              haptic('selection');
              onChange(item.slug);
            }}
            className={cn(
              'relative shrink-0 whitespace-nowrap rounded-2xl px-4 py-2.5 text-[14px] font-bold transition-colors duration-200',
              isActive ? 'text-white' : 'bg-surface text-ink shadow-card'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="filter-pill"
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                className="absolute inset-0 rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 shadow-cta"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <span aria-hidden>{item.emoji}</span>
              {item.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
