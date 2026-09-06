'use client';

import { cn } from '@/lib/utils';

/**
 * Brend logotipi — qizil doira ichida pitssa yetkazuvchi kuryer.
 *
 * Referens uslubida noldan chizilgan original SVG (birovning rasmi nusxasi emas):
 * to'q qizil disk, oq siluet, chap tomonda tezlik chiziqlari.
 * Vektor bo'lgani uchun favicon o'lchamidan splash ekranigacha bir xil aniqlikda.
 */

export function LogoMark({
  className,
  style,
  animated = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label="Pizza Hub"
      style={style}
      className={cn('block', className)}
    >
      <defs>
        <radialGradient id="logo-disc" cx="34%" cy="26%" r="86%">
          <stop offset="0%" stopColor="#F2564A" />
          <stop offset="52%" stopColor="#E02B20" />
          <stop offset="100%" stopColor="#9C1811" />
        </radialGradient>
        <linearGradient id="logo-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Disk */}
      <circle cx="64" cy="64" r="64" fill="url(#logo-disc)" />
      <circle cx="64" cy="64" r="64" fill="url(#logo-gloss)" />

      {/* Tezlik chiziqlari */}
      <g fill="#fff" opacity="0.55">
        <rect x="6" y="52" width="22" height="5" rx="2.5" />
        <rect x="2" y="66" width="17" height="5" rx="2.5" />
        <rect x="8" y="80" width="13" height="5" rx="2.5" />
      </g>

      {/* Skuter va kuryer — bitta uzluksiz oq siluet */}
      <g fill="#fff">
        {/* g'ildiraklar */}
        <circle cx="40" cy="92" r="13" />
        <circle cx="96" cy="92" r="13" />

        {/* oyoq taxtasi */}
        <rect x="42" y="84" width="56" height="9" rx="4.5" />

        {/* orqa ustun — quti tayanchi */}
        <path d="M30 86 L30 64 Q30 58 36 58 L52 58 L56 86 Z" />

        {/* kuryer tanasi (bosh bilan tutashadi) */}
        <path d="M55 84 Q53 66 62 57 Q68 50 77 53 L83 65 Q85 75 82 84 Z" />

        {/* qo'l — rulga cho'zilgan */}
        <path d="M78 59 L101 52" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" />

        {/* rul ustuni va dastasi */}
        <path d="M94 84 L100 55" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        <path d="M96 50 L111 46" stroke="#fff" strokeWidth="7" strokeLinecap="round" />

        {/* kaska */}
        <circle cx="72" cy="44" r="11" />
        {/* kaska kozirkasi — oldinga */}
        <path d="M80 41 L91 44 L80 48 Z" />
      </g>

      {/* Yuz ochig'i (kaska ichida) */}
      <path d="M74 45 Q81 47 79 53 Q73 53 73 48 Z" fill="#C21F16" opacity="0.9" />

      {/* G'ildirak markazlari */}
      <circle cx="40" cy="92" r="5" fill="#C21F16" />
      <circle cx="96" cy="92" r="5" fill="#C21F16" />

      {/* Pitssa qutisi — orqa ustun ustida */}
      <g transform="rotate(-7 38 44)">
        <rect x="20" y="31" width="34" height="27" rx="4" fill="#fff" />
        <rect x="20" y="31" width="34" height="7" rx="3" fill="#FFE2B0" />
        {/* qutidagi bo'lak */}
        <path d="M28 54 L37 40 L46 54 Z" fill="#F5A623" />
        <circle cx="37" cy="47" r="1.9" fill="#C21F16" />
        <circle cx="33" cy="51" r="1.5" fill="#C21F16" />
        <circle cx="41" cy="51" r="1.5" fill="#C21F16" />
      </g>

      {/* Yengil aylanma yorug'lik (animatsiya rejimida) */}
      {animated && (
        <circle
          cx="64"
          cy="64"
          r="60"
          fill="none"
          stroke="#FFD68A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="26 350"
          className="origin-center animate-spin-slow"
        />
      )}
    </svg>
  );
}

/** Logotip + brend nomi (sarlavhalar uchun). */
export function Logo({
  className,
  size = 36,
  showText = true,
}: {
  className?: string;
  size?: number;
  showText?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark style={{ width: size, height: size }} className="shrink-0 drop-shadow-sm" />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-tight text-ink">Pizza Hub</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600">
            Fast delivery
          </span>
        </span>
      )}
    </span>
  );
}
