/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blueprint: {
          light: '#f0f4f8',
          base: '#1a365d',
          dark: '#102a43',
          accent: '#63b3ed',
        }
      }
    },
  },
  plugins: [],
}
