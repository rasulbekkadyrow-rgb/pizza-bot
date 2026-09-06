import type { Config } from 'tailwindcss';

/**
 * Dizayn tizimi — iOS Telegram WebApp uslubiga moslangan.
 * Sirt ranglari (surface) CSS o'zgaruvchilari orqali keladi va Telegram temasiga moslashadi;
 * brend ranglari esa statik — ular tema o'zgarganda ham bir xil qoladi.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Telegram temasiga bog'langan sirtlar ──
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',

        /**
         * ── Brend qizili ──
         * Logotipdagi to'q, iliq qizil (skuterli kuryer belgisi).
         * Narxlar, chegirmalar va asosiy CTA shu rangda.
         */
        brand: {
          50: '#FEF2F1',
          100: '#FDDFDC',
          200: '#FABAB4',
          300: '#F58E85',
          400: '#EC5A4E',
          500: '#E02B20', // asosiy
          600: '#C21F16',
          700: '#9C1811',
          800: '#75120D',
          900: '#500C09',
        },

        /**
         * ── Amber ──
         * Fon referensidagi to'yingan sariq-zarg'aldoq.
         * Hero, storis halqasi, aksent bloklar.
         */
        amber: {
          50: '#FFF8EB',
          100: '#FFEDC7',
          200: '#FFDB8A',
          300: '#FFC64D',
          400: '#FFB425',
          500: '#F5A623', // asosiy
          600: '#DB8A0A',
          700: '#AD6A06',
          800: '#7E4C04',
          900: '#553202',
        },

        /** Eski `gold-*` nomlari amber bilan bir xil — kod buzilmasligi uchun. */
        gold: {
          400: '#FFB425',
          500: '#F5A623',
        },

        crust: '#E8C48A', // xamir/qadoq ohangi
        success: '#2FA84F',
        info: '#0A84FF',
      },

      fontFamily: {
        sans: [
          'var(--font-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.01em' }],
      },

      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },

      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12)',
        float: '0 8px 32px -8px rgb(0 0 0 / 0.24)',
        cta: '0 8px 24px -8px rgb(224 43 32 / 0.55)',
        amber: '0 10px 30px -10px rgb(245 166 35 / 0.6)',
        sheet: '0 -8px 40px -12px rgb(0 0 0 / 0.28)',
        /** Karusel doirasi ostidagi chuqur soya */
        disc: '0 26px 44px -18px rgb(90 42 0 / 0.45)',
      },

      spacing: {
        safe: 'env(safe-area-inset-bottom, 0px)',
        'nav-h': '4.5rem',
      },

      transitionTimingFunction: {
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'marquee-x': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.32, 0.72, 0, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        'marquee-x': 'marquee-x 22s linear infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
