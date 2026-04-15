/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        patches: {
          bg: '#f3f6f8',
          grid: '#ffffff',
          border: '#e0e0e0',
          clue: '#707070',
          orange: '#ff8a00',
          purple: '#a45cff',
          green: '#2e8b57',
          blue: '#00a3e0',
          red: '#ef4444',
          gold: '#c5a000',
          shadow: 'rgba(0, 0, 0, 0.05)',
        }
      }
    },
  },
  plugins: [],
}
