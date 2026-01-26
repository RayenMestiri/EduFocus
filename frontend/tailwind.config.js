/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Gold & Black Theme (Dark Mode)
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
        // Premium Blue & White Theme (Light Mode)
        'premium-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Main premium blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'sky': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #ffd700 0%, #ffb300 50%, #ff8f00 100%)',
        'gold-radial': 'radial-gradient(circle, #ffd700 0%, #ffb300 50%, #ff8f00 100%)',
        'black-gold': 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #ffd700 100%)',
        'blue-gradient': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
        'blue-radial': 'radial-gradient(circle, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
        'white-blue': 'linear-gradient(135deg, #ffffff 0%, #eff6ff 50%, #dbeafe 100%)',
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(255, 215, 0, 0.3)',
        'gold-lg': '0 10px 40px rgba(255, 215, 0, 0.4)',
        'gold-xl': '0 20px 60px rgba(255, 215, 0, 0.5)',
        'blue': '0 4px 20px rgba(59, 130, 246, 0.3)',
        'blue-lg': '0 10px 40px rgba(59, 130, 246, 0.4)',
        'blue-xl': '0 20px 60px rgba(59, 130, 246, 0.5)',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('light', '.light &');
    }
  ],
}
