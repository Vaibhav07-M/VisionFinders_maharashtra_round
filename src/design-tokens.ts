// Fair Drop Design Tokens
// Unifies the high-contrast aesthetic of Third Man Records, Quoti glassmorphism, and luxury event ticketing.

export const TOKENS = {
  colors: {
    bg: {
      app: '#090a0f',
      surface: '#12141c',
      surfaceRaised: '#181b26',
      surfaceSubtle: '#0d0e14',
      glass: 'rgba(18, 20, 28, 0.75)',
    },
    brand: {
      yellow: '#ffde00', // Third Man signature high-impact electric yellow
      yellowHover: '#facc15',
      darkYellow: '#ca8a04',
      cyan: '#06b6d4',
      emerald: '#10b981',
      rose: '#f43f5e',
      amber: '#f59e0b',
      violet: '#8b5cf6',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      muted: '#64748b',
      inverse: '#000000',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.16)',
      active: '#ffde00',
      danger: '#f43f5e',
      success: '#10b981',
    },
  },
  radii: {
    sm: '0.25rem', // 4px
    md: '0.5rem',  // 8px
    lg: '0.75rem', // 12px
    xl: '1rem',    // 16px
    full: '9999px',
  },
  typography: {
    fontSans: "'Plus Jakarta Sans', sans-serif",
    fontDisplay: "'Space Grotesk', sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    fontStamp: "'Syne', sans-serif",
  },
  shadows: {
    glowYellow: '0 0 25px -3px rgba(255, 222, 0, 0.35)',
    glowEmerald: '0 0 25px -3px rgba(16, 185, 129, 0.35)',
    glowCyan: '0 0 25px -3px rgba(6, 182, 212, 0.35)',
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  },
} as const;

export type ThemeTokens = typeof TOKENS;
