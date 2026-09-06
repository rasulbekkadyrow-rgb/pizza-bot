'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Truck } from 'lucide-react';
import { PageHeader } from '@/components/layout/Header';
import { CartList } from '@/components/features/CartList';
import { OrderBump } from '@/components/features/OrderBump';
import { CheckoutSheet } from '@/components/features/CheckoutSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/ErrorState';
import { useCart } from '@/hooks/useCart';
import { useCatalog } from '@/hooks/useCatalog';
import { useTelegram } from '@/hooks/useTelegram';
import { formatMoney, clamp } from '@/lib/utils';
import { Price } from '@/components/ui/Price';

/**
 * Savatcha: Order Stack → Order Bump → yakuniy summa → rasmiylashtirish.
 */
export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  const { addons } = useCatalog();
  const { showConfirm } = useTelegram();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Bepul yetkazishgacha progress
  const progress = clamp(
    (cart.subtotal / Math.max(cart.settings.freeDeliveryFrom, 1)) * 100,
    0,
    100
  );

  const handleClear = async () => {
    if (await showConfirm('Savatchani butunlay tozalaymizmi?')) cart.clear();
  };

  if (!cart.isHydrated) {
    return (
      <>
        <PageHeader title="Savatcha" />
        <div className="space-y-2.5 px-5 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-[94px] rounded-3xl" />
          ))}
        </div>
      </>
    );
  }

  if (cart.isEmpty) {
    return (
      <>
        <PageHeader title="Savatcha" />
        <EmptyState
          emoji="🛒"
          title="Savatchangiz bo‘sh"
          description="Menyudan sevimli pitssangizni tanlang — biz 30 daqiqada yetkazamiz."
          action={
            <Button fullWidth size="lg" onClick={() => router.push('/catalog')}>
              Menyuni ochish
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Savatcha"
        subtitle={`${cart.count} ta mahsulot`}
        right={
          <button
            type="button"
            onClick={handleClear}
            className="press flex items-center gap-1 rounded-full bg-surface px-3 py-2 text-[12px] font-bold text-muted shadow-card"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
            Tozalash
          </button>
        }
      />

      <div className="space-y-4 px-5 pt-4">
        {/* Bepul yetkazish progressi */}
        {!cart.isFreeDelivery && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-surface p-3.5 shadow-card"
          >
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Truck className="h-4 w-4 text-brand-500" strokeWidth={2.4} />
              Yana{' '}
              <span className="text-brand-500">{formatMoney(cart.remainingForFree)}</span> —
              yetkazish bepul!
            </p>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', damping: 26, stiffness: 200 }}
              />
            </div>
          </motion.div>
        )}

        {/* Order Stack */}
        <CartList lines={cart.lines} />

        {/* Order Bump (cross-sell) */}
        <OrderBump addon={addons[0]} />

        {/* Yakuniy hisob */}
        <section className="rounded-3xl bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-muted">Mahsulotlar ({cart.count})</span>
            <span className="text-[14px] font-bold text-ink">{formatMoney(cart.subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[14px] text-muted">Yetkazib berish</span>
            <span
              className={
                cart.isFreeDelivery
                  ? 'text-[14px] font-bold text-success'
                  : 'text-[14px] font-bold text-ink'
              }
            >
              {cart.isFreeDelivery ? 'BEPUL' : formatMoney(cart.deliveryFee)}
            </span>
          </div>

          <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
            <span className="text-[16px] font-bold text-ink">Jami</span>
            <motion.span
              key={cart.total}
              initial={{ scale: 1.08, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              className="text-[26px] font-extrabold leading-none tracking-tight text-brand-500"
            >
              <Price amount={cart.total} />
            </motion.span>
          </div>
        </section>

        <Button size="lg" fullWidth onClick={() => setIsCheckoutOpen(true)} className="!mt-5">
          Buyurtmani rasmiylashtirish
        </Button>

        <p className="pb-2 text-center text-[12px] text-muted">
          Tugmani bosgach, buyurtma operatorga yuboriladi
        </p>
      </div>

      <CheckoutSheet isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
    </>
  );
}
