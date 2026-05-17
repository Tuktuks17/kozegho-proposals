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
        destructive: { DEFAULT: '#dc2626', foreground: '#ffffff' },
        /* Kozegho design system tokens */
        'kz-bg': 'var(--kz-bg)',
        'kz-bg-elevated': 'var(--kz-bg-elevated)',
        'kz-surface': 'var(--kz-surface)',
        'kz-surface-soft': 'var(--kz-surface-soft)',
        'kz-surface-hover': 'var(--kz-surface-hover)',
        'kz-border': 'var(--kz-border)',
        'kz-border-strong': 'var(--kz-border-strong)',
        'kz-border-dark': 'var(--kz-border-dark)',
        'kz-text': 'var(--kz-text)',
        'kz-text-secondary': 'var(--kz-text-secondary)',
        'kz-text-muted': 'var(--kz-text-muted)',
        'kz-text-on-dark': 'var(--kz-text-on-dark)',
        'kz-text-on-dark-muted': 'var(--kz-text-on-dark-muted)',
        'kz-green': 'var(--kz-green)',
        'kz-green-hover': 'var(--kz-green-hover)',
        'kz-green-soft': 'var(--kz-green-soft)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
        'kz-card': 'var(--kz-radius-card)',
        'kz-input': 'var(--kz-radius-input)',
        'kz-button': 'var(--kz-radius-button)',
        'kz-pill': 'var(--kz-radius-pill)',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        'kz-card': 'var(--kz-shadow-card)',
        'kz-card-soft': 'var(--kz-shadow-card-soft)',
      }
    }
  },
  plugins: [animate]
} satisfies Config
