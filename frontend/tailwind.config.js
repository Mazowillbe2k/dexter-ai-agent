/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dexter-primary': '#6366f1',
        'dexter-secondary': '#8b5cf6',
        'dexter-accent': '#06b6d4',
        'dexter-dark': '#1e293b',
        'dexter-light': '#f8fafc',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 