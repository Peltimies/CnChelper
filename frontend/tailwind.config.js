/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#faf6ed',
          100: '#f3ead4',
          200: '#e6d5a8',
          300: '#d4bc7a',
          400: '#c4a45c',
          500: '#b08d44',
          600: '#92703a',
          700: '#735832',
          800: '#5c4629',
          900: '#3d2f1c',
        },
        arcane: {
          50: '#f0f0ff',
          100: '#e0e1ff',
          200: '#c6c8ff',
          300: '#a3a6fc',
          400: '#7f82f8',
          500: '#6366f1',
          600: '#5457e6',
          700: '#4a4dc9',
          800: '#3e3fa3',
          900: '#2d2e7a',
          950: '#1e1f54',
        },
        blood: {
          500: '#9b1c1c',
          600: '#871616',
          700: '#6b1010',
        },
      },
      fontFamily: {
        serif: ['"Cinzel"', '"Times New Roman"', 'serif'],
        body: ['"Crimson Text"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'inner-glow': 'inset 0 0 20px rgba(99, 102, 241, 0.1)',
        'arcane': '0 0 15px rgba(99, 102, 241, 0.3)',
        'parchment': '0 2px 8px rgba(61, 47, 28, 0.15), 0 0 0 1px rgba(180, 141, 68, 0.2)',
      },
    },
  },
  plugins: [],
};
