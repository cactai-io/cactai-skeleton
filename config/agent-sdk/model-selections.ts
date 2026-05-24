// config/agent-sdk/model-selections.ts
// Developer-customized Agent SDK model selections per task type.
//
// Edit via DevShell Settings → AI Model Selection (Phase 14).
// Do NOT edit manually — the settings panel rewrites this file on every
// save and manual edits are overwritten.
//
// See @cactai-io/core/agent-sdk for the dispatch layer that reads this.
// v1.3.6 — types sourced from @cactai-io/types (public) so the skeleton
// has no build-time dependency on @cactai-io/core (private).

import type { ModelSelections } from '@cactai-io/types';
import { DEFAULT_MODEL_SELECTIONS } from '@cactai-io/types';

export const MODEL_SELECTIONS: ModelSelections = {
  ...DEFAULT_MODEL_SELECTIONS,
  // Developer overrides applied here by the settings panel. Empty by
  // default — every task type runs at its platform default.
};
