/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'bertoni-gold': '#C5A059',
        'bertoni-dark': '#0a0a0a',
        'bertoni-darker': '#050505',
        'bertoni-cream': '#FDFCF8',
        'bertoni-light-gold': '#D4B574',
      },
    },
  },
  plugins: [],
}
