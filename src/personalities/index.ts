// src/personalities/index.ts
// Personalities live on the Cactai platform server. They are not shipped
// to deployed apps — when the platform renders agent output, the active
// personality is already applied server-side.
//
// This file exists so the skeleton can list locally-known personality
// names for display purposes only (e.g. showing "Powered by Milo" in
// the footer). It does not load personality logic.

export const PERSONALITIES: Record<string, { display_name: string }> = {
  milo: { display_name: 'Milo' },
  sam:  { display_name: 'SAM' },
};
