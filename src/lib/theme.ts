// src/lib/theme.ts
//
// The app's design tokens. This is the SINGLE source of truth the DevShell
// Visual Theme Inspector reads and edits (GET/PATCH /v1/projects/:id/files/theme
// parse this `export const theme` object via ts-morph).
//
// It ships pre-populated with a complete, real default theme (the platform
// "Obsidian Light" palette) so the wizard's Design → Theme step has something
// concrete to load and "Use default" is an affirmative, build-complete choice —
// never an empty placeholder. The dev edits it in the Theme Inspector (pre-build
// in the wizard, or later on the Design config tab); the build generates the
// final token/CSS files from whatever this resolves to.
//
// Keep every value a literal (string / number / nested object literal) — the
// inspector's parser only reads literal leaves.

export const theme = {
  color: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#6366F1',
    accentSubtle: '#EEF2FF',
    error: '#FF6B35',
    warning: '#FFD700',
    success: '#00D68F',
    surface: '#FFFFFF',
    background: '#F8F8FC',
    overlay: 'rgba(30,27,75,0.4)',
    border: '#E2E8F0',
    text: {
      primary: '#1E1B4B',
      secondary: '#64748B',
      tertiary: '#94A3B8',
      disabled: '#94A3B8',
    },
  },
  typography: {
    fontFamily: {
      base: "'Roboto', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0em',
      wide: '0.05em',
    },
  },
  spacing: {
    unit: 4,
    scale: {
      '0': '0px',
      '1': '4px',
      '2': '8px',
      '3': '12px',
      '4': '16px',
      '5': '20px',
      '6': '24px',
      '8': '32px',
      '10': '40px',
      '12': '48px',
      '16': '64px',
      '20': '80px',
      '24': '96px',
    },
  },
  radii: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shape: {
    borderRadius: {
      none: 0,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 20,
      full: 9999,
    },
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(99,102,241,0.06)',
    md: '0 4px 6px rgba(99,102,241,0.08)',
    lg: '0 10px 15px rgba(99,102,241,0.10)',
  },
  transitions: {
    fast: '100ms ease',
    normal: '200ms ease',
    slow: '350ms ease',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
  zIndex: {
    base: 0,
    overlay: 100,
    modal: 200,
    tooltip: 300,
  },
} as const;

export type AppTheme = typeof theme;

export default theme;
