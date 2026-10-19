/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#132644',
          dark: '#0d1b30',
          light: '#1e3a5f',
          surface: '#183157',
        },
        lemony: {
          DEFAULT: '#E2FF65',
          dark: '#c8e84a',
          light: '#f1ffaa',
        },
        nashville: {
          DEFAULT: '#8CC3E1',
          dark: '#6aaecf',
          light: '#bde0f2',
          surface: 'rgba(140, 195, 225, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 20px -2px rgba(19, 38, 68, 0.15)',
      }
    },
  },
  plugins: [],
}
