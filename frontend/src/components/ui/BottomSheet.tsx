'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * iOS uslubidagi Bottom Sheet.
 *
 * - Pastdan tepaga silliq qalqib chiqadi (spring animatsiya).
 * - Pastga sudrab (drag) yopiladi: 120px dan oshsa yoki tez surilsa.
 * - `footer` — kontent skroll qilinganda ham pastda yopishib turadi (sticky CTA).
 */

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
  /** Ekran balandligining ulushi (0–1) */
  maxHeight?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const SPRING = { type: 'spring' as const, damping: 34, stiffness: 340, mass: 0.85 };

export function BottomSheet({
  isOpen,
  onClose,
  children,
  footer,
  title,
  maxHeight = '92dvh',
  showHandle = true,
  showCloseButton = true,
  className,
}: BottomSheetProps) {
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 400], [1, 0]);

  // Fon skrollini bloklash
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('is-locked');
    return () => document.body.classList.remove('is-locked');
  }, [isOpen]);

  // Escape tugmasi (desktop / brauzer rejimi)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 700) onClose();
    else y.set(0);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Fon */}
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            style={{ opacity: backdropOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{ y, maxHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative flex w-full max-w-lg flex-col overflow-hidden',
              'rounded-t-[28px] bg-elevated shadow-sheet',
              className
            )}
          >
            {/* Sudrash uchun "handle" */}
            {showHandle && (
              <div className="flex shrink-0 cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing">
                <span className="h-1.5 w-10 rounded-full bg-muted/35" />
              </div>
            )}

            {(title || showCloseButton) && (
              <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-1">
                <h2 className="text-[19px] font-bold tracking-tight text-ink">{title}</h2>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Yopish"
                    className="press grid h-8 w-8 place-items-center rounded-full bg-line/60 text-muted"
                  >
                    <X className="h-[18px] w-[18px]" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}

            {/* Skroll qilinadigan kontent */}
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>

            {/* Yopishib turuvchi CTA */}
            {footer && (
              <div className="safe-bottom shrink-0 border-t border-line/70 bg-elevated px-5 pt-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
