import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kozegho: {
          green: '#7AB648',
          'green-dark': '#6aa33d',
          'green-light': '#eaf5de',
          dark: '#333333',
          grey: '#F5F5F5',
          'grey-text': '#6b6b6b'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: '#7AB648', foreground: '#ffffff' },
        secondary: { DEFAULT: '#F5F5F5', foreground: '#333333' },
        muted: { DEFAULT: '#F5F5F5', foreground: '#6b6b6b' },
        destructive: { DEFAULT: '#dc2626', foreground: '#ffffff' }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: { lg: '16px', md: '12px', sm: '8px' },
      boxShadow: { card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }
    }
  },
  plugins: [animate]
} satisfies Config
