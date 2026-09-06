'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useTelegram } from '@/hooks/useTelegram';
import { cn } from '@/lib/utils';

/**
 * Ekran pastiga yopishgan navigatsiya (iOS TabBar uslubi).
 * Faol tab ostidagi "pill" `layoutId` orqali silliq ko'chadi.
 */

const TABS = [
  { href: '/', label: 'Bosh sahifa', Icon: Home },
  { href: '/catalog', label: 'Katalog', Icon: Search },
  { href: '/cart', label: 'Savatcha', Icon: ShoppingBag, withBadge: true },
  { href: '/profile', label: 'Profil', Icon: User },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const { count } = useCart();
  const { haptic } = useTelegram();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 glass border-t border-line/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {TABS.map(({ href, label, Icon, ...rest }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const withBadge = 'withBadge' in rest && rest.withBadge;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                onClick={() => haptic('selection')}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5"
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                    className="absolute inset-x-2 top-1 h-[38px] rounded-2xl bg-brand-500/10"
                  />
                )}

                <span className="relative">
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-colors duration-200',
                      isActive ? 'text-brand-500' : 'text-muted'
                    )}
                    strokeWidth={isActive ? 2.6 : 2}
                  />

                  <AnimatePresence>
                    {withBadge && count > 0 && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 400 }}
                        className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white ring-2 ring-bg"
                      >
                        {count > 99 ? '99+' : count}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>

                <span
                  className={cn(
                    'relative text-[10px] font-semibold tracking-tight transition-colors duration-200',
                    isActive ? 'text-brand-500' : 'text-muted'
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
