'use client';

import { RefreshCw } from 'lucide-react';

/** Tarmoq/server xatosi uchun umumiy holat bloki. */
export function ErrorState({
  message,
  onRetry,
  emoji = '😕',
  title = 'Ma’lumotlarni yuklab bo‘lmadi',
}: {
  message?: string;
  onRetry?: () => void;
  emoji?: string;
  title?: string;
}) {
  return (
    <div className="rounded-3xl bg-surface p-6 text-center shadow-card">
      <p className="text-[32px] leading-none">{emoji}</p>
      <p className="mt-2.5 text-[15px] font-bold text-ink">{title}</p>
      {message && <p className="mt-1 text-[13px] leading-snug text-muted">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="press mx-auto mt-4 flex items-center gap-1.5 rounded-2xl bg-brand-500 px-5 py-2.5 text-[14px] font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.6} />
          Qayta urinish
        </button>
      )}
    </div>
  );
}

/** Bo'sh ro'yxat holati (savat, buyurtmalar tarixi). */
export function EmptyState({
  emoji = '🛒',
  title,
  description,
  action,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-surface text-[44px] shadow-card">
        {emoji}
      </div>
      <h2 className="mt-5 text-[19px] font-extrabold tracking-tight text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-[16rem] text-[14px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-6 w-full max-w-[16rem]">{action}</div>}
    </div>
  );
}
