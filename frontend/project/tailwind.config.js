/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        beige: {
          50: '#fefdfb',
          100: '#fdf9f2',
          200: '#f9f2e2',
          300: '#f4e8c8',
          400: '#edd9a3',
          500: '#e4c678',
          600: '#d4b05a',
          700: '#b8954a',
          800: '#9d7f42',
          900: '#7d653a',
        },
        brown: {
          50: '#faf7f2',
          100: '#f4eee3',
          200: '#e8d7c1',
          300: '#dab896',
          400: '#c8946b',
          500: '#b87b4e',
          600: '#a0522d',
          700: '#8b4513',
          800: '#723a12',
          900: '#5d2f12',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(139, 69, 19, 0.08)',
        'medium': '0 4px 20px rgba(139, 69, 19, 0.12)',
        'strong': '0 8px 30px rgba(139, 69, 19, 0.16)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale': 'scale 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scale: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
};