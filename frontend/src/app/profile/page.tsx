'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Package, Phone, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/Header';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';
import { useTelegram } from '@/hooks/useTelegram';
import { api } from '@/lib/api';
import { formatMoney, formatDateTime, initials, cn } from '@/lib/utils';
import type { Me, Order } from '@/lib/types';

/** Profil: foydalanuvchi, statistika va buyurtmalar tarixi. */
export default function ProfilePage() {
  const { user, isTelegram, isReady, webApp } = useTelegram();

  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!isTelegram) {
      setIsLoading(false);
      return;
    }

    let alive = true;
    Promise.all([api.getMe(), api.getMyOrders()])
      .then(([profile, list]) => {
        if (!alive) return;
        setMe(profile);
        setOrders(list);
      })
      .catch((err: Error) => alive && setError(err.message))
      .finally(() => alive && setIsLoading(false));

    return () => {
      alive = false;
    };
  }, [isReady, isTelegram]);

  const name =
    me?.fullName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    'Foydalanuvchi';

  return (
    <>
      <PageHeader title="Profil" />

      <div className="space-y-4 px-5 pt-4">
        {/* Foydalanuvchi kartochkasi */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-card"
        >
          <div className="relative h-16 w-16 shrink-0">
            {user?.photo_url ? (
              <Image
                src={user.photo_url}
                alt={name}
                fill
                sizes="64px"
                className="rounded-full object-cover ring-2 ring-brand-500/25"
              />
            ) : (
              <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-brand-400 to-gold-500 text-[20px] font-bold text-white">
                {initials(name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[19px] font-extrabold tracking-tight text-ink">{name}</h2>
            {user?.username && (
              <p className="truncate text-[13px] text-muted">@{user.username}</p>
            )}
            {me?.phone && (
              <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                <Phone className="h-3 w-3" strokeWidth={2.5} />
                {me.phone}
              </p>
            )}
          </div>
        </motion.section>

        {/* Statistika */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            Icon={Package}
            value={String(me?.stats.ordersCount ?? 0)}
            label="Buyurtmalar"
          />
          <StatCard
            Icon={Wallet}
            value={formatMoney(me?.stats.spent ?? 0)}
            label="Jami sarflangan"
          />
        </div>

        {/* Buyurtmalar tarixi */}
        <section>
          <h3 className="mb-2.5 px-1 text-[13px] font-bold uppercase tracking-wide text-muted">
            Buyurtmalar tarixi
          </h3>

          {!isTelegram && isReady ? (
            <div className="rounded-3xl bg-surface p-5 text-center shadow-card">
              <p className="text-[28px]">📱</p>
              <p className="mt-2 text-[14px] font-bold text-ink">Telegram orqali oching</p>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                Buyurtmalar tarixi faqat Telegram Mini App ichida ko‘rinadi.
              </p>
            </div>
          ) : error ? (
            <ErrorState message={error} />
          ) : isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-3xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              emoji="📦"
              title="Hali buyurtmalar yo‘q"
              description="Birinchi buyurtmangizni bering — u shu yerda ko‘rinadi."
            />
          ) : (
            <ul className="space-y-2.5">
              {orders.map((order, i) => (
                <motion.li
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-3xl bg-surface p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-extrabold text-ink">{order.publicNo}</p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                        statusStyle(order.status)
                      )}
                    >
                      {order.statusLabel}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted">
                    {order.items.map((item) => `${item.title} ×${item.quantity}`).join(', ')}
                  </p>

                  <p className="mt-2 text-[17px] font-extrabold text-ink">
                    {formatMoney(order.total)}
                  </p>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        {/* Qo'llab-quvvatlash */}
        <button
          type="button"
          onClick={() =>
            webApp?.openTelegramLink(
              `https://t.me/${process.env.NEXT_PUBLIC_SUPPORT_USERNAME || 'telegram'}`
            )
          }
          className="press flex w-full items-center gap-3 rounded-3xl bg-surface p-4 text-left shadow-card"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-info/12">
            <MessageCircle className="h-5 w-5 text-info" strokeWidth={2.3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-ink">Qo‘llab-quvvatlash</span>
            <span className="block text-[12px] text-muted">Savolingiz bormi? Yozing — javob beramiz</span>
          </span>
        </button>

        <p className="pb-2 text-center text-[11px] text-muted">
          {process.env.NEXT_PUBLIC_BRAND_NAME || 'Pizza Hub'} · v1.0.0
        </p>
      </div>
    </>
  );
}

function StatCard({
  Icon,
  value,
  label,
}: {
  Icon: typeof Package;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-500/10">
        <Icon className="h-[18px] w-[18px] text-brand-500" strokeWidth={2.4} />
      </span>
      <p className="mt-2.5 text-[20px] font-extrabold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-[12px] font-medium text-muted">{label}</p>
    </div>
  );
}

function statusStyle(status: Order['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-success/12 text-success';
    case 'CANCELLED':
      return 'bg-brand-500/12 text-brand-500';
    case 'PENDING':
    case 'CONFIRMED':
      return 'bg-gold-500/15 text-gold-500';
    default:
      return 'bg-info/12 text-info';
  }
}
