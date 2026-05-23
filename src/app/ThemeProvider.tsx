// src/app/ThemeProvider.tsx
// Client component — applies design tokens as CSS custom properties on mount.
// Also reads active theme from config/theme/active.ts and applies it.
// Token changes during DevShell sessions are applied via src/lib/tokens.ts.
//
// This file does NOT hardcode SAMTheme (or any other named theme). It dynamic-
// imports the generated `config/theme/active.ts`, which project provisioning
// writes during workflow Stage 4 (theme). Until provisioning writes that file,
// `DEFAULT_TOKENS` is the fallback — and DEFAULT_TOKENS happens to match the
// SAM theme today as a sensible first-paint default. Don't change the default;
// it's not authoritative — it's the safety net for the pre-provisioning render.

'use client';

import { useEffect } from 'react';
import { applyTheme, DEFAULT_TOKENS } from '@/lib/tokens';

// This import is replaced by the workflow agent with the active theme.
// Until then, DEFAULT_TOKENS are used.
let activeTheme: Record<string, string> = DEFAULT_TOKENS;
try {
  // Dynamic import of the generated theme — may not exist until workflow Stage 4
  const themeModule = require('../../config/theme/active');
  if (themeModule?.tokens) activeTheme = { ...DEFAULT_TOKENS, ...themeModule.tokens };
} catch { /* theme not yet generated — use defaults */ }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(activeTheme);
  }, []);

  return <>{children}</>;
}
