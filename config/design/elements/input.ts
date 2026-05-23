// config/design/elements/input.ts
// Input element design spec — populated by the agent during workflow Stage 3.

import type { DesignTokens } from '../tokens';

export interface InputSpec {
  background:        string;
  border:            string;
  borderFocus:       string;
  borderRadius:      string;
  padding:           string;
  fontSize:          string;
  color:             string;
  placeholderColor:  string;
  focusRing:         string;
  errorBorder:       string;
}

export function buildInputSpec(_tokens: DesignTokens): InputSpec {
  return {
    background:       '',
    border:           '',
    borderFocus:      '',
    borderRadius:     '',
    padding:          '',
    fontSize:         '',
    color:            '',
    placeholderColor: '',
    focusRing:        '',
    errorBorder:      '',
  };
}
