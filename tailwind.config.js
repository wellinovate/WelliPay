/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#fcfbf9',
          100: '#f3f2f2',
          200: '#eae7e7',
          300: '#d7d3d3',
          400: '#bab6b6',
          500: '#9b9797',
        },
        ink: {
          900: '#201e1d',
          800: '#2d2b2b',
          700: '#444141',
          600: '#605d5d',
          500: '#7d7979',
        },
        broadsheet: {
          accent: '#0088b0',
          accentDark: '#006786',
          accentLight: '#e9f8ff',
          dispute: '#d6006c',
          disputeLight: '#fff1f4',
          yellow: '#edbb00',
        }
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(32, 30, 29, 0.08), 0 1px 2px rgba(32, 30, 29, 0.04)',
        'broadsheet': '0 3px 10px rgba(45, 43, 43, 0.08)',
      }
    },
  },
  plugins: [],
}
