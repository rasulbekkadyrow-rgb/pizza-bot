'use client';

import Image from 'next/image';
import { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { LogoMark } from '@/components/ui/Logo';
import { useTelegram } from '@/hooks/useTelegram';
import { initials, cn } from '@/lib/utils';

/**
 * Bosh sahifa sarlavhasi — Telegram profilidan olingan shaxsiy salomlashuv.
 * Skroll qilinganda "glass" effekti bilan yopishib turadi.
 */

export function Header({ className }: { className?: string }) {
  const { user, isReady } = useTelegram();
  const [imgFailed, setImgFailed] = useState(false);

  /**
   * Faqat haqiqiy ism ko'rsatiladi.
   * Telegram tashqarisida (brauzerda) ism yo'q — o'rniga brend nomi turadi,
   * "Mehmon" kabi sun'iy murojaat ishlatilmaydi.
   */
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    process.env.NEXT_PUBLIC_BRAND_NAME ||
    'Pizza Hub';
  const photo = user?.photo_url;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 glass border-b border-line/60',
        'px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative h-11 w-11 shrink-0">
          {photo && !imgFailed ? (
            <Image
              src={photo}
              alt={name}
              fill
              sizes="44px"
              className="rounded-full object-cover ring-2 ring-brand-500/25"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-brand-400 to-gold-500 text-[15px] font-bold text-white">
              {isReady ? initials(name) : ''}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg bg-success" />
        </div>

        {/* Foydalanuvchi — faqat ismi, sun'iy salomlashuvsiz */}
        <div className="min-w-0 flex-1">
          {isReady ? (
            <h1 className="truncate text-[19px] font-extrabold leading-tight tracking-tight text-ink">
              {name}
            </h1>
          ) : (
            <span className="skeleton block h-5 w-28 rounded-full" />
          )}
        </div>

        {/* Manzil chipi */}
        <button
          type="button"
          className="press flex items-center gap-1 rounded-full bg-surface px-3 py-2 text-[12px] font-semibold text-ink shadow-card"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" strokeWidth={2.5} />
          <span className="truncate">Toshkent</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2.5} />
        </button>

        {/* Brend belgisi */}
        <LogoMark className="h-9 w-9 shrink-0 drop-shadow-sm" />
      </div>
    </header>
  );
}

/** Ichki sahifalar uchun soddalashtirilgan sarlavha. */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 glass border-b border-line/60 px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
        </div>
        {right ?? <LogoMark className="h-8 w-8 shrink-0 opacity-90" />}
      </div>
    </header>
  );
}
