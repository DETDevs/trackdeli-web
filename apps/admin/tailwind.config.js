/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00C853',
        secondary: '#1A1A2E',
        accent: '#FF6B35',
        background: '#0F0F1A',
        surface: '#1E1E2E',
      }
    },
  },
  plugins: [],
}
