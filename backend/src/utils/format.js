'use strict';

const config = require('../config/default');

/**
 * Formatlash yordamchilari (pul, sana, HTML escape).
 *
 * Pul birligi — O'zbekiston so'mi. Summalar butun sonda saqlanadi
 * (tiyin ishlatilmaydi), shuning uchun bo'lish/yaxlitlash umuman yo'q.
 */

/** 79000 → "79 000 so'm" (ajratgich — uzilmas probel) */
function money(amount, symbol = config.business.currencySymbol) {
  const value = Math.round(Number(amount) || 0);
  const grouped = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return symbol ? `${grouped} ${symbol}` : grouped;
}

/** Telegram HTML parse_mode uchun xavfsiz matn. */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 2026-09-01T18:20:00Z → "01.09.2026, 23:20" (Toshkent vaqti) */
function dateTime(value, timeZone = 'Asia/Tashkent') {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(d);
}

/** Telefon raqamni +998 XX XXX XX XX ko'rinishiga keltirish (imkoni bo'lsa). */
function phone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return raw || '—';
}

module.exports = { money, escapeHtml, dateTime, phone };
