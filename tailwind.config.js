/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Material You System Colors
        primary: 'var(--md-sys-color-primary)',
        onPrimary: 'var(--md-sys-color-on-primary)',
        primaryContainer: 'var(--md-sys-color-primary-container)',
        onPrimaryContainer: 'var(--md-sys-color-on-primary-container)',
        
        secondary: 'var(--md-sys-color-secondary)',
        onSecondary: 'var(--md-sys-color-on-secondary)',
        secondaryContainer: 'var(--md-sys-color-secondary-container)',
        onSecondaryContainer: 'var(--md-sys-color-on-secondary-container)',
        
        tertiary: 'var(--md-sys-color-tertiary)',
        onTertiary: 'var(--md-sys-color-on-tertiary)',
        tertiaryContainer: 'var(--md-sys-color-tertiary-container)',
        onTertiaryContainer: 'var(--md-sys-color-on-tertiary-container)',
        
        error: 'var(--md-sys-color-error)',
        onError: 'var(--md-sys-color-on-error)',
        errorContainer: 'var(--md-sys-color-error-container)',
        onErrorContainer: 'var(--md-sys-color-on-error-container)',
        
        background: 'var(--md-sys-color-background)',
        onBackground: 'var(--md-sys-color-on-background)',
        
        surface: 'var(--md-sys-color-surface)',
        onSurface: 'var(--md-sys-color-on-surface)',
        surfaceVariant: 'var(--md-sys-color-surface-variant)',
        onSurfaceVariant: 'var(--md-sys-color-on-surface-variant)',
        inverseSurface: 'var(--md-sys-color-inverse-surface)',
        inverseOnSurface: 'var(--md-sys-color-inverse-on-surface)',
        
        outline: 'var(--md-sys-color-outline)',
        outlineVariant: 'var(--md-sys-color-outline-variant)',
        
        // Aliases for backward compatibility
        'surface-primary': 'var(--md-sys-color-surface)',
        surfaceDim: 'var(--md-sys-color-surface-dim)',
        surfaceBright: 'var(--md-sys-color-surface-bright)',
        surfaceContainerLowest: 'var(--md-sys-color-surface-container-lowest)',
        surfaceContainerLow: 'var(--md-sys-color-surface-container-low)',
        surfaceContainer: 'var(--md-sys-color-surface-container)',
        surfaceContainerHigh: 'var(--md-sys-color-surface-container-high)',
        surfaceContainerHighest: 'var(--md-sys-color-surface-container-highest)',
        
        'accent': 'var(--md-sys-color-tertiary)',
        'accent-ring': 'var(--md-sys-color-tertiary-container)',

        // Faint opacities using color-mix (requires modern browser)
        'primary/5': 'color-mix(in srgb, var(--md-sys-color-primary) 5%, transparent)',
        'primary/10': 'color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent)',
        'primary/20': 'color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent)',

        'black': '#000000',
        'white': '#ffffff',
        'slate': { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
        'red': { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
        'amber': { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
        'green': { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
        'blue': { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
        'purple': { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
        'cyan': { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
        'rose': { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
        'indigo': { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
        'orange': { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
        'pink': { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
        'yellow': { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
        'emerald': { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
        'gray': { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.accent-primary': { 'accent-color': '#c0ff60' }
      })
    },
    function ({ addComponents }) {
      addComponents({
        '.custom-scrollbar': {
          '&::-webkit-scrollbar': { width: '8px', height: '8px' },
          '&::-webkit-scrollbar-track': { background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255, 255, 255, 0.3)' },
        }
      })
    }
  ],
}