// config/design/elements/modal.ts
// Modal element design spec — populated by the agent during workflow Stage 3.

import type { DesignTokens } from '../tokens';

export interface ModalSpec {
  overlay:      string;   // backdrop background
  background:   string;
  borderRadius: string;
  padding:      string;
  shadow:       string;
  maxWidth:     string;
  animation:    string;   // e.g. 'fade-up 200ms ease'
}

export function buildModalSpec(_tokens: DesignTokens): ModalSpec {
  return {
    overlay:      '',
    background:   '',
    borderRadius: '',
    padding:      '',
    shadow:       '',
    maxWidth:     '',
    animation:    '',
  };
}
