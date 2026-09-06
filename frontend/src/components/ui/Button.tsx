'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Asosiy tugma komponenti.
 * iOS uslubi: yumaloq burchaklar, bosilganda "cho'kish", yumshoq soya.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-cta hover:from-brand-400 hover:to-brand-500',
  secondary: 'bg-elevated text-ink border border-line hover:bg-line/40',
  ghost: 'bg-transparent text-brand-500 hover:bg-brand-50/60',
  danger: 'bg-brand-600 text-white hover:bg-brand-700',
  success: 'bg-success text-white hover:brightness-105',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-xl gap-1.5',
  md: 'h-12 px-5 text-[15px] rounded-2xl gap-2',
  lg: 'h-14 px-6 text-[17px] rounded-2xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth,
    isLoading,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-semibold',
        'transition-all duration-200 ease-ios active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-45',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2.5} />
      ) : (
        leftIcon
      )}
      <span className={cn('truncate', isLoading && 'opacity-80')}>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
});
