'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Banknote, MapPin, Phone, User as UserIcon, PartyPopper } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useCart } from '@/hooks/useCart';
import { useTelegram } from '@/hooks/useTelegram';
import { api, ApiRequestError } from '@/lib/api';
import { formatMoney, formatPhone, isValidPhone, cn } from '@/lib/utils';
import { Price } from '@/components/ui/Price';

/**
 * Buyurtmani rasmiylashtirish oynasi.
 *
 * Yuborilgandan so'ng backend:
 *   1) buyurtmani PENDING holatida bazaga yozadi,
 *   2) adminga inline tugmali kartochka jo'natadi,
 *   3) mijozga tasdiq xabarini yuboradi.
 */

interface Errors {
  customerName?: string;
  phone?: string;
  address?: string;
}

export function CheckoutSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const cart = useCart();
  const { user, haptic, showAlert } = useTelegram();

  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ publicNo: string; total: number } | null>(null);

  // Telegram profilidan ismni oldindan to'ldirish
  useEffect(() => {
    if (!isOpen || !user) return;
    if (!cart.draft.customerName) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      cart.updateDraft({ customerName: fullName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const validate = (): boolean => {
    const next: Errors = {};
    if (cart.draft.customerName.trim().length < 2) next.customerName = 'Ismingizni kiriting';
    if (!isValidPhone(cart.draft.phone)) next.phone = 'To‘liq raqam kiriting';
    if (cart.draft.address.trim().length < 5) next.address = 'Manzilni batafsil yozing';

    setErrors(next);
    if (Object.keys(next).length) haptic('error');
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || cart.isEmpty) return;

    setIsSubmitting(true);
    try {
      const order = await api.createOrder({
        items: cart.toPayloadItems(),
        customerName: cart.draft.customerName.trim(),
        phone: cart.draft.phone.trim(),
        address: cart.draft.address.trim(),
        comment: cart.draft.comment.trim() || null,
        paymentMethod: cart.draft.paymentMethod,
      });

      haptic('success');
      cart.clear();
      onClose();
      setSuccess({ publicNo: order.publicNo, total: order.total });
    } catch (err) {
      haptic('error');
      showAlert(describeOrderError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Rasmiylashtirish"
        footer={
          <div className="pb-1">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[14px] font-semibold text-muted">To‘lanadi</span>
              <Price amount={cart.total} className="text-[22px] font-extrabold tracking-tight text-ink" />
            </div>
            <Button
              size="lg"
              fullWidth
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={cart.isEmpty}
            >
              Buyurtmani yuborish
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 px-5 pb-5 pt-1">
          <Input
            label="Ismingiz"
            placeholder="Masalan: Aziz Karimov"
            value={cart.draft.customerName}
            onChange={(e) => cart.updateDraft({ customerName: e.target.value })}
            error={errors.customerName}
            leftIcon={<UserIcon className="h-[18px] w-[18px]" strokeWidth={2.2} />}
            autoComplete="name"
          />

          <Input
            label="Telefon raqam"
            placeholder="+998 90 123 45 67"
            inputMode="tel"
            value={cart.draft.phone}
            onChange={(e) => cart.updateDraft({ phone: formatPhone(e.target.value) })}
            error={errors.phone}
            leftIcon={<Phone className="h-[18px] w-[18px]" strokeWidth={2.2} />}
            autoComplete="tel"
          />

          <Textarea
            label="Yetkazib berish manzili"
            placeholder="Ko‘cha, uy, kvartira, mo‘ljal"
            rows={2}
            value={cart.draft.address}
            onChange={(e) => cart.updateDraft({ address: e.target.value })}
            error={errors.address}
          />

          <Textarea
            label="Izoh (ixtiyoriy)"
            placeholder="Masalan: eshik qo‘ng‘irog‘i ishlamaydi"
            rows={2}
            value={cart.draft.comment}
            onChange={(e) => cart.updateDraft({ comment: e.target.value })}
          />

          {/* To'lov turi */}
          <div>
            <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">To‘lov turi</span>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { value: 'CARD', label: 'Karta orqali', Icon: CreditCard },
                  { value: 'CASH', label: 'Naqd pul', Icon: Banknote },
                ] as const
              ).map(({ value, label, Icon }) => {
                const isActive = cart.draft.paymentMethod === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      haptic('selection');
                      cart.updateDraft({ paymentMethod: value });
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-2xl border-2 px-3.5 py-3 text-left transition-all duration-200',
                      isActive
                        ? 'border-brand-500 bg-brand-500/8'
                        : 'border-line bg-surface'
                    )}
                  >
                    <Icon
                      className={cn('h-5 w-5 shrink-0', isActive ? 'text-brand-500' : 'text-muted')}
                      strokeWidth={2.3}
                    />
                    <span
                      className={cn(
                        'text-[13.5px] font-bold',
                        isActive ? 'text-brand-500' : 'text-ink'
                      )}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Yakuniy hisob */}
          <div className="space-y-2 rounded-3xl bg-surface p-4">
            <Row label="Mahsulotlar" value={formatMoney(cart.subtotal)} />
            <Row
              label="Yetkazib berish"
              value={cart.isFreeDelivery ? 'BEPUL' : formatMoney(cart.deliveryFee)}
              accent={cart.isFreeDelivery}
            />
            <div className="!mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-[15px] font-bold text-ink">Jami</span>
              <Price amount={cart.total} className="text-[19px] font-extrabold tracking-tight text-brand-500" />
            </div>
          </div>

          <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-muted">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
            Buyurtmani yuborgach, operator siz bilan bog‘lanadi va to‘lov ma’lumotlarini
            Telegram orqali yuboradi.
          </p>
        </div>
      </BottomSheet>

      {/* Muvaffaqiyat oynasi */}
      <Modal
        isOpen={Boolean(success)}
        onClose={() => setSuccess(null)}
        title="Buyurtma qabul qilindi!"
        description={`Raqami: ${success?.publicNo ?? ''} · ${formatMoney(success?.total ?? 0)}`}
        footer={
          <Button fullWidth size="lg" onClick={() => setSuccess(null)}>
            Ajoyib
          </Button>
        }
      >
        <div className="flex justify-center py-2">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-success/12">
            <PartyPopper className="h-10 w-10 text-success" strokeWidth={2} />
          </div>
        </div>
        <p className="text-center text-[14px] leading-relaxed text-muted">
          Operator buyurtmani ko‘rib chiqmoqda. Tasdiqlangach, to‘lov ma’lumotlari
          Telegram chatingizga yuboriladi 🍕
        </p>
      </Modal>
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] text-muted">{label}</span>
      <span className={cn('text-[14px] font-bold', accent ? 'text-success' : 'text-ink')}>
        {value}
      </span>
    </div>
  );
}

/**
 * Xato kodini mijoz tushunadigan va NIMA QILISHNI biladigan matnga aylantiradi.
 * Quruq "So'rovni bajarib bo'lmadi" mijozni boshi berk ko'chaga olib kiradi.
 */
function describeOrderError(err: unknown): string {
  if (!(err instanceof ApiRequestError)) {
    return 'Buyurtmani yuborib bo‘lmadi. Qayta urinib ko‘ring.';
  }

  switch (err.code) {
    case 'NO_INIT_DATA':
    case 'NO_USER':
      return 'Ilova Telegram orqali ochilmagan. Botga qaytib, «Buyurtma berish» tugmasidan qayta oching.';
    case 'BAD_SIGNATURE':
      return 'Sessiya tekshiruvidan o‘tmadi. Ilovani yopib, botdan qayta oching.';
    case 'EXPIRED':
      return 'Sessiya muddati tugagan. Ilovani yopib, qaytadan oching.';
    case 'ITEMS_UNAVAILABLE':
      return 'Ba’zi mahsulotlar tugadi. Savatni yangilab, qayta urinib ko‘ring.';
    case 'VALIDATION_ERROR':
      return 'Ma’lumotlar to‘liq emas — ism, telefon va manzilni tekshiring.';
    case 'TOO_MANY_REQUESTS':
      return 'Juda ko‘p urinish bo‘ldi. Bir daqiqadan so‘ng qayta urinib ko‘ring.';
    case 'TIMEOUT':
    case 'NETWORK_ERROR':
      return 'Serverga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.';
    default:
      return err.message || 'Buyurtmani yuborib bo‘lmadi. Qayta urinib ko‘ring.';
  }
}
