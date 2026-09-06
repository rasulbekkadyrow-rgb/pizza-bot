'use client';

import { formatAmount, cn } from '@/lib/utils';

/**
 * Narx ko'rsatkichi.
 *
 * Nima uchun alohida komponent: so'm summalari dollarga qaraganda ancha uzun
 * ("79 000 so'm" vs "$12.90"). Agar "so'm" ni asosiy matn o'lchamida yozsak,
 * u tor joylarda (kartochka, tugma) ikkinchi qatorga tushib ketadi.
 * Shuning uchun raqam yirik, birlik esa kichik va hech qachon uzilmaydi.
 */

export function Price({
  amount,
  className,
  unitClassName,
  showUnit = true,
}: {
  amount: number;
  className?: string;
  unitClassName?: string;
  /** Juda tor joylarda birlikni umuman ko'rsatmaslik mumkin */
  showUnit?: boolean;
}) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {formatAmount(amount)}
      {showUnit && (
        <span className={cn('ml-1 text-[0.55em] font-bold opacity-70', unitClassName)}>so‘m</span>
      )}
    </span>
  );
}

/** Ustiga chizilgan eski narx. */
export function OldPrice({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums line-through opacity-70', className)}>
      {formatAmount(amount)}
      <span className="ml-0.5 text-[0.7em]">so‘m</span>
    </span>
  );
}
