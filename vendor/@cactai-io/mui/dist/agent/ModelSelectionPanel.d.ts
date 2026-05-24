import type { ThemeTokens } from '@cactai-io/themes';
import { type AgentTaskTypeSlug } from '@cactai-io/types';
import type { JSX } from 'react';
type Tier = 'haiku' | 'sonnet' | 'opus';
export declare const PANEL_DEFAULT_SELECTIONS: Record<AgentTaskTypeSlug, Tier>;
/** Optional admin-only override per row. Operator shell uses this to
 *  hide individual rows from end users while keeping them visible to
 *  admins + super admins. */
export type AdminOnlyMap = Partial<Record<AgentTaskTypeSlug, boolean>>;
export interface ModelSelectionPanelProps {
    /** Current selections — typically loaded from
     *  project_state.decisions.model_selections_v1. */
    selections: Partial<Record<AgentTaskTypeSlug, Tier>>;
    /** Resolved current model IDs for each tier (from the daily
     *  ModelResolver refresh). Shown as muted secondary text under each
     *  dropdown so the developer knows the actual model version. */
    resolvedModelIds: {
        haiku: string;
        sonnet: string;
        opus: string;
    };
    /** Called when the developer changes any row. Host saves to its
     *  persistence layer (DevShell side: directly to settings; operate
     *  side: via /api/operate/model-selections PUT). */
    onChange: (next: Partial<Record<AgentTaskTypeSlug, Tier>>) => void;
    /** Operator shell version exposes this — defaults to false (DevShell
     *  side has no admin-only concept). When true, each row gets an
     *  admin-only icon toggle and the two zone-level visibility toggles
     *  render at the top. */
    operatorMode?: boolean;
    /** Operator shell zone-level toggles. Only meaningful when
     *  operatorMode is true. */
    endUserVisible?: boolean;
    endUserEditable?: boolean;
    adminOnly?: AdminOnlyMap;
    onOperatorChange?: (changes: {
        endUserVisible?: boolean;
        endUserEditable?: boolean;
        adminOnly?: AdminOnlyMap;
    }) => void;
    /** Operator shell only: "Remove this section from operate shell
     *  entirely" button hookup. */
    onRemoveFromOperate?: () => void;
    /** Theme tokens. Optional — defaults to inline CSS variables. */
    theme?: Pick<ThemeTokens, 'color' | 'shape' | 'typography'>;
}
export declare function ModelSelectionPanel(props: ModelSelectionPanelProps): JSX.Element;
export {};
