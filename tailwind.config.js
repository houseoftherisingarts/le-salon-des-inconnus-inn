/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './constants.ts',
    './types.ts',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#d4af37',
          muted: '#c5a059',
          warm: '#dcb055',
          cream: '#f3e5ab',
          'cream-warm': '#faeecd',
        },
        ink: {
          DEFAULT: '#050505',
          900: '#0a0a0a',
          800: '#0e0e0e',
          700: '#141414',
          600: '#18181b',
          warm: '#161915',
        },
        wwoof: '#3a7d44',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        lato: ['Lato', 'sans-serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        sans: ['Lato', 'sans-serif'],
        display: ['Cinzel', 'serif'],
      },
      fontSize: {
        // Award-tier fluid display scale — for hero + section titles
        // refs: Lagunitas (cream/red ~200px), Bespoke (clean ~160px), Europa (~240px)
        'display-xl': ['clamp(6rem, 18vw, 18rem)',  { lineHeight: '0.9',  letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(4.5rem, 12vw, 12rem)', { lineHeight: '0.9',  letterSpacing: '-0.015em' }],
        'display':    ['clamp(3rem, 8vw, 7rem)',     { lineHeight: '1',    letterSpacing: '-0.01em' }],
        'eyebrow':    ['0.75rem',                     { lineHeight: '1',    letterSpacing: '0.3em' }],
      },
      letterSpacing: {
        editorial: '0.18em',
        eyebrow: '0.5em',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      keyframes: {
        fadeInView: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'fade-in-view': 'fadeInView 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
