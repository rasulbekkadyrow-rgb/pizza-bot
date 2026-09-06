/* Kichik, bog'liqliksiz yordamchi funksiyalar */

/** Shartli klasslarni birlashtirish (clsx'ning mini varianti). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Pul birligi — O'zbekiston so'mi.
 * Summalar butun sonda (tiyin yo'q), shuning uchun bo'lish ham, yaxlitlash ham yo'q.
 */
export const CURRENCY_SYMBOL = "so'm";

/** 79000 → "79 000 so'm" */
export function formatMoney(amount: number, symbol: string = CURRENCY_SYMBOL): string {
  return symbol ? `${formatAmount(amount)} ${symbol}` : formatAmount(amount);
}

/** 79000 → "79 000" (belgisiz — tor joylar uchun) */
export function formatAmount(amount: number): string {
  return Math.round(amount || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Chegirma foizi: 99000 → 79000 = 20 */
export function discountPercent(oldPrice: number | null, newPrice: number): number {
  if (!oldPrice || oldPrice <= newPrice) return 0;
  return Math.round((1 - newPrice / oldPrice) * 100);
}

/** "01.09.2026, 23:20" */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Telefon maskasi: 998901234567 → +998 90 123 45 67 */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  if (!d) return '';
  const parts = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)];
  return '+' + parts.filter(Boolean).join(' ');
}

/** Telefon to'liq kiritilganmi (O'zbekiston formati). */
export function isValidPhone(raw: string): boolean {
  return raw.replace(/\D/g, '').length >= 9;
}

/** Ismning bosh harflari — avatar zaxirasi uchun. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Kunning vaqtiga qarab salomlashuv. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

/** Debounce — qidiruv maydoni uchun. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Qiymatni oraliqqa siqish. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
