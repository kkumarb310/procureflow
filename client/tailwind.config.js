/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b12',
        surface: '#13131f',
        'surface-2': '#1a1a28',
        border: '#23233a',
        muted: '#7a7a95',
        text: '#e8e8f4',
        brand: {
          DEFAULT: '#6366f1',
          50: '#eef0ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        ok: '#10b981',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.3), 0 8px 40px rgba(99,102,241,0.15)',
        card: '0 1px 3px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
      },
    },
  },
  plugins: [],
};
