// src/lib/tokens.ts
// TokenBroadcast — live design token preview without deploy.
//
// When the agent changes a design token (colour, spacing, typography),
// this module:
//   1. Applies the change immediately as a CSS custom property on document.documentElement
//   2. Buffers the change to localStorage for commit via the existing /api/github/commit flow
//
// v1.2 commit-flow rebuild: this module migrated from sessionStorage to
// localStorage. The buffer is now shared across tabs on the same browser
// profile so a token edit in one tab survives a refresh and is visible
// to peer tabs immediately. The commit-time read shape and the skeleton.config.json
// patch model are unchanged.
//
// Because the role view preview renders in the same document (same React tree,
// no iframe), CSS custom property changes are visible instantly across all role views.
//
// Usage:
//   import { setToken, applyTheme, getBufferedTokens } from '@/lib/tokens'
//   setToken('color_primary', '#6366F1')  // instant visual update + buffered
//   applyTheme(tokens)                    // apply full theme at init

export type DesignToken = string;

// localStorage key prefix for buffered token edits. Keys are flat — the
// segment after the prefix is the token name, which becomes the
// dot-path passed to setDeep when the commit route lands.
const STORAGE_KEY_PREFIX = 'cactai_config_theme.tokens.';

// Map our token names to CSS custom property names.
function toCSSVar(tokenName: string): string {
  return `--${tokenName.replace(/_/g, '-')}`;
}

// Apply a single token — CSS update + localStorage buffer.
export function setToken(name: string, value: DesignToken): void {
  if (typeof document === 'undefined') return;

  // Immediate CSS update.
  document.documentElement.style.setProperty(toCSSVar(name), value);

  // Buffer to localStorage for commit. Cross-tab via the `storage` event,
  // surviving a page refresh in the same tab.
  const key = `${STORAGE_KEY_PREFIX}${name}`;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* QuotaExceeded or storage disabled — non-fatal */ }
}

// Apply a full theme token set — called at initialisation and on theme switch.
export function applyTheme(tokens: Record<string, DesignToken>): void {
  if (typeof document === 'undefined') return;
  for (const [name, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(toCSSVar(name), value);
  }
}

// Read buffered token changes from localStorage (used by commit flow).
export function getBufferedTokens(): Record<string, DesignToken> {
  if (typeof localStorage === 'undefined') return {};
  const result: Record<string, DesignToken> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      const tokenName = key.replace(STORAGE_KEY_PREFIX, '');
      try {
        result[tokenName] = JSON.parse(localStorage.getItem(key) ?? '""');
      } catch { /* skip malformed */ }
    }
  }
  return result;
}

// Clear buffered tokens after commit.
export function clearBufferedTokens(): void {
  if (typeof localStorage === 'undefined') return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

// CSS variable baseline — injected by ThemeProvider at mount.
// Extend this object during the workflow theme step.
export const DEFAULT_TOKENS: Record<string, DesignToken> = {
  color_primary:         '#6366F1',
  color_secondary:       '#818CF8',
  color_background:      '#0A0A0F',
  color_surface:         '#13131F',
  color_text:            '#F5F5FA',
  color_text_secondary:  '#8B8B9F',
  color_border:          '#1E1E2E',
  color_error:           '#FF3C77',
  color_warning:         '#FFD700',
  color_success:         '#00D68F',
  font_family_base:      "'Sora', system-ui, sans-serif",
  font_family_mono:      "'JetBrains Mono', monospace",
  font_size_sm:          '12px',
  font_size_md:          '14px',
  font_size_lg:          '18px',
  border_radius_sm:      '6px',
  border_radius_md:      '10px',
  border_radius_lg:      '16px',
  spacing_unit:          '8px',
};
