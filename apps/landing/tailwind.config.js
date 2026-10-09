/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tinta: '#141414',
        papel: '#FAFAF8',
        gris: '#6B6B6B',
        linea: '#E8E8E4',
        suave: '#F2F2EF',
        lima: {
          dark: '#5FA22B',
          light: '#8FD14F',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      maxWidth: {
        container: '1120px',
      },
    },
  },
  plugins: [],
};
