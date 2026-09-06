'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogoMark } from './Logo';

/**
 * Kirish animatsiyasi (splash).
 *
 * Ilova ochilganda logotip amber fonda "chiqadi", disk atrofida yorug'lik
 * aylanadi va ekran yuqoriga surilib ochiladi. Seans davomida faqat bir marta —
 * sahifalar orasida yurganda qayta ko'rinmaydi.
 */

const SESSION_KEY = 'pizza-splash-shown';
const DURATION_MS = 1500;

export function Splash() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let shown = false;
    try {
      shown = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      /* sessionStorage bloklangan */
    }
    if (shown) return;

    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
    }, DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600"
        >
          {/* Fon tipografikasi */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[26vw] font-black uppercase leading-none tracking-tight text-white/15"
          >
            Pizza
          </span>

          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -25 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 13, stiffness: 190 }}
            className="relative"
          >
            <LogoMark animated className="h-32 w-32 drop-shadow-2xl" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative mt-6 text-[13px] font-extrabold uppercase tracking-[0.3em] text-white"
          >
            Pizza Hub
          </motion.p>

          {/* Yuklanish chizig'i */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: DURATION_MS / 1000, ease: 'easeInOut' }}
            className="relative mt-4 h-1 w-24 origin-left rounded-full bg-white/70"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
