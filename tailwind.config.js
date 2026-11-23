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
        guard: {
          bg: '#0a0806',
          card: '#141008',
          cardBorder: '#2d2215',
          red: '#dc2626',
          gold: '#d4a017',
          amber: '#f59e0b',
          rose: '#e11d48',
          crimson: '#b91c1c',
          ember: '#ea580c'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-charge': 'flowCharge 1.5s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.9, filter: 'drop-shadow(0 0 15px rgba(220, 38, 38, 0.6))' },
          '50%': { opacity: 0.4, filter: 'drop-shadow(0 0 5px rgba(220, 38, 38, 0.2))' },
        },
        flowCharge: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        }
      }
    },
  },
  plugins: [],
}
