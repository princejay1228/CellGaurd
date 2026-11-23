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
          bg: '#060913',
          card: '#0c1322',
          cardBorder: '#1e293b',
          cyan: '#00f2fe',
          violet: '#7928ca',
          electric: '#00c6ff',
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981',
          teal: '#14b8a6'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-charge': 'flowCharge 1.5s linear infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.9, filter: 'drop-shadow(0 0 15px rgba(0, 242, 254, 0.6))' },
          '50%': { opacity: 0.4, filter: 'drop-shadow(0 0 5px rgba(0, 242, 254, 0.2))' },
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
