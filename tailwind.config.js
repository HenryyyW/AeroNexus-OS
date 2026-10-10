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
          dark: '#090a0f',
          panel: '#11131c',
          blue: '#10b981',
          red: '#10b981',
          green: '#10b981'
        }
      }
    },
  },
  plugins: [],
}