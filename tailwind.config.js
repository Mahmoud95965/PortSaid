/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-cairo)', 'Cairo', 'Tahoma', 'sans-serif'] },
      colors: {
        ocean: { 50:'#eef6ff', 100:'#d9ebff', 500:'#1e90ff', 700:'#1559b7', 900:'#0b2a5b' },
        teal2: { 100:'#d5f7f3', 400:'#22d3c5', 500:'#0fb8ad', 600:'#0a9a92' },
        sand: { 50:'#fffaf0', 100:'#fff1d6', 200:'#ffe3a8', 400:'#ffb938' },
        coral: { 400:'#ff7a59', 500:'#f0452a' }
      }
    }
  },
  plugins: [],
}
