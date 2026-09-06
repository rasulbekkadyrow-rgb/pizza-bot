'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Forma maydonlari — iOS "grouped list" uslubida.
 * Xato holati qizil ramka + qisqa izoh bilan ko'rsatiladi.
 */

interface FieldShellProps {
  label?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ label, error, hint, children, className }: FieldShellProps) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      )}
      {children}
      {(error || hint) && (
        <span
          className={cn(
            'mt-1.5 block px-1 text-[12px]',
            error ? 'text-brand-500' : 'text-muted'
          )}
        >
          {error || hint}
        </span>
      )}
    </label>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, className, wrapperClassName, ...props },
  ref
) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName}>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border bg-surface px-4',
          'transition-colors duration-200',
          'focus-within:border-brand-500/70 focus-within:ring-4 focus-within:ring-brand-500/10',
          error ? 'border-brand-500/70' : 'border-line'
        )}
      >
        {leftIcon && <span className="shrink-0 text-muted">{leftIcon}</span>}
        <input
          ref={ref}
          className={cn(
            'h-[52px] min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-ink outline-none',
            'placeholder:text-muted/70',
            className
          )}
          {...props}
        />
        {rightSlot && <span className="shrink-0">{rightSlot}</span>}
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, wrapperClassName, rows = 3, ...props },
  ref
) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full resize-none rounded-2xl border bg-surface px-4 py-3.5 text-[16px] text-ink outline-none',
          'transition-colors duration-200 placeholder:text-muted/70',
          'focus:border-brand-500/70 focus:ring-4 focus:ring-brand-500/10',
          error ? 'border-brand-500/70' : 'border-line',
          className
        )}
        {...props}
      />
    </FieldShell>
  );
});

/**
 * Switch'ning FAQAT ko'rinishi (span'lardan iborat).
 *
 * Nima uchun alohida: agar butun kartochka bosiladigan tugma bo'lsa
 * (masalan Order Bump), uning ichiga yana `<button>` qo'yib bo'lmaydi —
 * bu yaroqsiz HTML va React hydration xatosini beradi.
 */
export function SwitchTrack({
  checked,
  disabled,
  className,
}: {
  checked: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative block h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ease-ios',
        checked ? 'bg-success' : 'bg-line',
        disabled && 'opacity-50',
        className
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md',
          'transition-transform duration-300 ease-ios',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        )}
      />
    </span>
  );
}

/** iOS uslubidagi Toggle Switch — mustaqil boshqaruv element sifatida. */
export function Switch({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <SwitchTrack checked={checked} disabled={disabled} />
    </button>
  );
}
