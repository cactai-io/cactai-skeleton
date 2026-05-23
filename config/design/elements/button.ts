// config/design/elements/button.ts
// Button element design spec — populated by the agent during workflow Stage 3.
// References tokens from ../tokens.ts. Never hardcodes values.
// The agent reads skeleton.config.json theme.buttons section and writes here.
//
// This file defines the visual spec for the app's button system.
// The DevShell uses its own button system (ds- classes) — this is for the developer's app.

import type { DesignTokens } from '../tokens';

export interface ButtonSpec {
  // Primary action button
  primary: {
    background:   string;
    color:        string;
    borderRadius: string;
    padding:      string;
    fontSize:     string;
    fontWeight:   number;
    border:       string;
    shadow:       string;
    hoverScale:   string;
  };
  // Secondary / ghost button
  secondary: {
    background:   string;
    color:        string;
    borderRadius: string;
    padding:      string;
    fontSize:     string;
    border:       string;
  };
  // Destructive button
  destructive: {
    background:   string;
    color:        string;
    borderRadius: string;
  };
}

// Stub — agent populates based on resolved tokens
export function buildButtonSpec(_tokens: DesignTokens): ButtonSpec {
  return {
    primary:     { background:'', color:'', borderRadius:'', padding:'', fontSize:'', fontWeight:600, border:'', shadow:'', hoverScale:'' },
    secondary:   { background:'', color:'', borderRadius:'', padding:'', fontSize:'', border:'' },
    destructive: { background:'', color:'', borderRadius:'' },
  };
}
