const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        line: token('line'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        accent: token('accent'),
        'accent-soft': token('accent-soft'),
        'accent-ink': token('accent-ink'),
        ok: token('ok'),
        warn: token('warn'),
        bad: token('bad'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', '"Cascadia Code"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / .06), 0 4px 16px -6px rgb(var(--shadow) / .10)',
        pop: '0 12px 40px -8px rgb(var(--shadow) / .30)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: { from: { opacity: '0', transform: 'scale(.97)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        rise: 'rise .35s ease-out both',
        fade: 'fade .2s ease-out both',
        pop: 'pop .18s ease-out both',
      },
    },
  },
  plugins: [],
};
