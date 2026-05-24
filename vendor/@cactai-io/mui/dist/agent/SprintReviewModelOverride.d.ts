import { type AgentTaskTypeSlug } from '@cactai-io/types';
import type { JSX } from 'react';
type Tier = 'haiku' | 'sonnet' | 'opus';
export interface SprintTaskOverride {
    task_id: string;
    task_type: AgentTaskTypeSlug;
    /** Tier currently selected from settings — the "current" column. */
    current_tier: Tier;
    /** Override for this sprint — initialised to current_tier; the
     *  developer changes via the dropdown. */
    override_tier: Tier;
    /** Human-readable task summary surfaced alongside the task type
     *  label (e.g. "Add stock ticker watchlist"). */
    task_summary?: string;
}
export interface SprintReviewModelOverrideProps {
    /** The sprint's planned tasks. Each renders as one row. */
    tasks: SprintTaskOverride[];
    /** Resolved current model IDs per tier — surfaced as muted text under
     *  each dropdown so the developer knows the concrete model version. */
    resolvedModelIds: {
        haiku: string;
        sonnet: string;
        opus: string;
    };
    /** Called when the developer changes a per-task override. */
    onOverrideChange: (task_id: string, tier: Tier) => void;
    /** Called when the developer clicks "Save as default" for a task
     *  type. The host writes the value to project_state.decisions
     *  .model_selections_v1 via the same /api/operate/model-selections
     *  route Phase 14's settings panel uses. */
    onSaveAsDefault?: (task_type: AgentTaskTypeSlug, tier: Tier) => void;
}
export declare function SprintReviewModelOverride(props: SprintReviewModelOverrideProps): JSX.Element;
export {};
