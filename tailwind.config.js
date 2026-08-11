/** @type {import('tailwindcss').Config} */
const withAlpha = (token) => `rgb(var(${token}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: withAlpha('--bg'),
        surface: withAlpha('--surface'),
        'surface-2': withAlpha('--surface-2'),
        ink: withAlpha('--ink'),
        'ink-muted': withAlpha('--ink-muted'),
        'ink-faint': withAlpha('--ink-faint'),
        border: withAlpha('--border'),
        'border-strong': withAlpha('--border-strong'),
        brand: withAlpha('--brand'),
        'brand-strong': withAlpha('--brand-strong'),
        'brand-tint': withAlpha('--brand-tint'),
        pass: withAlpha('--pass'),
        'pass-tint': withAlpha('--pass-tint'),
        fail: withAlpha('--fail'),
        'fail-tint': withAlpha('--fail-tint'),
        warn: withAlpha('--warn'),
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Denser v2 ramp — see docs/STYLEGUIDE.md §3.
        display: ['2rem', { lineHeight: '1.1', fontWeight: '700' }],
        h1: ['1.375rem', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['1.0625rem', { lineHeight: '1.25', fontWeight: '600' }],
        h3: ['0.9375rem', { lineHeight: '1.35', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.45' }],
        label: ['0.6875rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.08em' }],
        mono: ['0.875rem', { lineHeight: '1.5' }],
        'mono-sm': ['0.78rem', { lineHeight: '1.5' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgb(26 29 41 / 0.06)',
        md: '0 4px 16px rgb(26 29 41 / 0.08)',
        lg: '0 12px 40px rgb(26 29 41 / 0.12)',
        focus: '0 0 0 3px rgb(var(--brand) / 0.35)',
      },
      keyframes: {
        'flip-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'flip-in': 'flip-in 260ms ease-out',
        'fade-in': 'fade-in 160ms ease-out',
        'slide-in': 'slide-in 220ms ease-out',
      },
    },
  },
  plugins: [],
}
