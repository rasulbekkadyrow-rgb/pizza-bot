'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Markazda ochiladigan dialog (tasdiqlash, muvaffaqiyat ekrani va h.k.).
 * Bottom Sheet'dan farqi: sudrab yopilmaydi va ekran o'rtasida turadi.
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Fonni bosganda yopilsinmi */
  dismissable?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  dismissable = true,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('is-locked');
    const onKey = (e: KeyboardEvent) => dismissable && e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('is-locked');
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose, dismissable]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dismissable && onClose()}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn(
              'relative w-full max-w-sm overflow-hidden rounded-3xl bg-elevated p-6 shadow-float',
              className
            )}
          >
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Yopish"
                className="press absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-line/60 text-muted"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={2.5} />
              </button>
            )}

            {title && (
              <h2 className="pr-8 text-center text-[20px] font-bold tracking-tight text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-2 text-center text-[15px] leading-relaxed text-muted">{description}</p>
            )}

            {children && <div className="mt-4">{children}</div>}
            {footer && <div className="mt-6 flex gap-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
