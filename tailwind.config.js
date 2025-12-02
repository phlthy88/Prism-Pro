/** @type {import('tailwindcss').Config} */
export default {
  // Fix: Scans root directory and specific subfolders
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}", // Kept for safety
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Material You System Colors
        primary: 'var(--md-sys-color-primary)',
        'on-primary': 'var(--md-sys-color-on-primary)',
        'primary-container': 'var(--md-sys-color-primary-container)',
        'on-primary-container': 'var(--md-sys-color-on-primary-container)',

        secondary: 'var(--md-sys-color-secondary)',
        'on-secondary': 'var(--md-sys-color-on-secondary)',
        'secondary-container': 'var(--md-sys-color-secondary-container)',
        'on-secondary-container': 'var(--md-sys-color-on-secondary-container)',

        tertiary: 'var(--md-sys-color-tertiary)',
        'on-tertiary': 'var(--md-sys-color-on-tertiary)',
        'tertiary-container': 'var(--md-sys-color-tertiary-container)',
        'on-tertiary-container': 'var(--md-sys-color-on-tertiary-container)',

        error: 'var(--md-sys-color-error)',
        'on-error': 'var(--md-sys-color-on-error)',
        'error-container': 'var(--md-sys-color-error-container)',
        'on-error-container': 'var(--md-sys-color-on-error-container)',

        background: 'var(--md-sys-color-background)',
        'on-background': 'var(--md-sys-color-on-background)',

        surface: 'var(--md-sys-color-surface)',
        'on-surface': 'var(--md-sys-color-on-surface)',
        'surface-variant': 'var(--md-sys-color-surface-variant)',
        'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
        'inverse-surface': 'var(--md-sys-color-inverse-surface)',
        'inverse-on-surface': 'var(--md-sys-color-inverse-on-surface)',

        outline: 'var(--md-sys-color-outline)',
        'outline-variant': 'var(--md-sys-color-outline-variant)',

        // Surface Levels (for depth/elevation)
        'surface-dim': 'var(--md-sys-color-surface-dim)',
        'surface-bright': 'var(--md-sys-color-surface-bright)',
        'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest)',
        'surface-container-low': 'var(--md-sys-color-surface-container-low)',
        'surface-container': 'var(--md-sys-color-surface-container)',
        'surface-container-high': 'var(--md-sys-color-surface-container-high)',
        'surface-container-highest': 'var(--md-sys-color-surface-container-highest)',

        'accent-ring': 'var(--md-sys-color-tertiary-container)',
        scrim: 'var(--md-sys-color-scrim)',

        // Dynamic Accents (Vibrant highlights)
        accent: {
          cyan: 'var(--accent-cyan)',
          blue: 'var(--accent-blue)',
          green: 'var(--accent-green)',
          amber: 'var(--accent-amber)',
          orange: 'var(--accent-orange)',
          pink: 'var(--accent-pink)',
          purple: 'var(--accent-purple)',
          lime: 'var(--accent-lime)',
        }
      },
      // Material Design 3 Elevation System
      boxShadow: {
        // MD3 Elevation Levels
        'elevation-0': 'none',
        'elevation-1': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'elevation-2': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.3)',
        'elevation-4': '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px 0px rgba(0, 0, 0, 0.3)',
        'elevation-5': '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px 0px rgba(0, 0, 0, 0.3)',

        // Accent Glows (for highlights)
        'glow-cyan': '0 0 16px var(--accent-cyan-glow), 0 0 32px var(--accent-cyan-glow)',
        'glow-blue': '0 0 16px var(--accent-blue-glow), 0 0 32px var(--accent-blue-glow)',
        'glow-green': '0 0 16px var(--accent-green-glow), 0 0 32px var(--accent-green-glow)',
        'glow-amber': '0 0 16px var(--accent-amber-glow), 0 0 32px var(--accent-amber-glow)',
        'glow-orange': '0 0 16px var(--accent-orange-glow), 0 0 32px var(--accent-orange-glow)',
        'glow-pink': '0 0 16px var(--accent-pink-glow), 0 0 32px var(--accent-pink-glow)',
        'glow-purple': '0 0 16px var(--accent-purple-glow), 0 0 32px var(--accent-purple-glow)',
        'glow-lime': '0 0 16px var(--accent-lime-glow), 0 0 32px var(--accent-lime-glow)',
      },
      // Material Design 3 Shape System
      borderRadius: {
        'none': '0px',
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '32px',
        'full': '9999px',
      }
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.accent-primary': { 'accent-color': '#c0ff60' }
      })
    }
  ],
}