/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#12244D',
          'navy-dark': '#0A152E',
          'navy-light': '#1E3A7B',
          'navy-subtle': '#F0F4FA',
          teal: '#0B6B69',
          'teal-dark': '#074C4A',
          'teal-light': '#12918E',
          'teal-accent': '#14B8A6',
          'teal-subtle': '#EBF7F6',
        },
        paper: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
        },
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
        },
        broadsheet: {
          accent: '#0B6B69',
          accentDark: '#074C4A',
          accentLight: '#EBF7F6',
          dispute: '#d6006c',
          disputeLight: '#fff1f4',
          yellow: '#d97706',
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(18, 36, 77, 0.06), 0 1px 2px rgba(18, 36, 77, 0.04)',
        'broadsheet': '0 4px 14px rgba(18, 36, 77, 0.08)',
        'card': '0 2px 8px -2px rgba(18, 36, 77, 0.06), 0 1px 4px -1px rgba(18, 36, 77, 0.04)',
        'brand': '0 4px 20px -4px rgba(11, 107, 105, 0.25)',
      }
    },
  },
  plugins: [],
}
