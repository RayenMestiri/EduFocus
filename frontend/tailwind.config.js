/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Gold & Black Theme
        'gold': {
          50: '#fffef0',
          100: '#fffacd',
          200: '#fff59d',
          300: '#fff176',
          400: '#ffeb3b',
          500: '#ffd700', // Main gold
          600: '#ffb300',
          700: '#ff8f00',
          800: '#ff6f00',
          900: '#e65100',
        },
        'amber': {
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #ffd700 0%, #ffb300 50%, #ff8f00 100%)',
        'gold-radial': 'radial-gradient(circle, #ffd700 0%, #ffb300 50%, #ff8f00 100%)',
        'black-gold': 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #ffd700 100%)',
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(255, 215, 0, 0.3)',
        'gold-lg': '0 10px 40px rgba(255, 215, 0, 0.4)',
        'gold-xl': '0 20px 60px rgba(255, 215, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
