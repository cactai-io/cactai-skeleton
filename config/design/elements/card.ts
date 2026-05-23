// config/design/elements/card.ts
// Card element design spec — populated by the agent during workflow Stage 3.
// References tokens from ../tokens.ts. Never hardcodes values.

import type { DesignTokens } from '../tokens';

export interface CardSpec {
  background:   string;
  border:       string;
  borderRadius: string;
  padding:      string;
  shadow:       string;
  // Elevated variant — used for modals, popovers
  elevated: {
    background: string;
    shadow:     string;
  };
}

export function buildCardSpec(_tokens: DesignTokens): CardSpec {
  return {
    background:   '',
    border:       '',
    borderRadius: '',
    padding:      '',
    shadow:       '',
    elevated: { background: '', shadow: '' },
  };
}
