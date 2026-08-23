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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
