/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#050b14',
          panel: 'rgba(10, 20, 35, 0.7)',
          blue: '#00f0ff',
          red: '#ff003c',
          green: '#00ff66'
        }
      }
    },
  },
  plugins: [],
}