/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'pickmo': {
          bg:      'var(--bg)',
          surface: 'var(--surface)',
          sidebar: 'var(--sidebar)',
          input:   'var(--input)',
          text:    'var(--text)',
          muted:   'var(--muted)',
        }
      },
      animation: {
        'cursor-blink': 'cursorBlink 1s step-end infinite',
        'pulse-slow':   'pulseSlow 2.5s ease-in-out infinite',
        'fade-down':    'fadeDown 0.2s ease-out both',
      },
      keyframes: {
        cursorBlink: {
          '0%, 50%':   { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.05)' },
        },
        fadeDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        }
      },
      boxShadow: {
        'glow-violet':  '0 0 20px rgba(124, 58, 237, 0.25)',
        'glow-emerald': '0 0 16px rgba(16, 185, 129, 0.2)',
        'glow-cyan':    '0 0 16px rgba(6, 182, 212, 0.2)',
      }
    },
  },
  plugins: [],
}
