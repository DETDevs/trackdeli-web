/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          25:  '#FAFAFA',
          50:  '#F5F5F5',
          100: '#EBEBEB',
          200: '#D6D6D6',
          300: '#ADADAD',
          400: '#858585',
          500: '#5C5C5C',
          600: '#3D3D3D',
          700: '#292929',
          800: '#1A1A1A',
          900: '#0F0F0F',
        },
        brand: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
        },
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem',    letterSpacing: '0.01em' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
        'base': ['1rem',     { lineHeight: '1.5rem',  letterSpacing: '0' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem',    letterSpacing: '-0.02em' }],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '6px',
        'lg':  '8px',
        'xl':  '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'xs':  '0 1px 2px 0 rgba(0,0,0,0.05)',
        'sm':  '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'md':  '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'lg':  '0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.03)',
      },
    },
  },
  plugins: [],
}
