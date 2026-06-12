import React from 'react';
export interface DecisionChatEntry {
    dev: string;
    assistant: string | null;
    at: string;
}
export interface DecisionOption {
    label: string;
    value: unknown;
    selected: boolean;
}
export interface DecisionStep {
    step: string;
    question: string;
    decision: unknown;
    options?: DecisionOption[];
    chat: DecisionChatEntry[];
}
export interface DecisionStage {
    stage: string;
    steps: DecisionStep[];
}
export interface DecisionLogPanelProps {
    stages: DecisionStage[];
    variant?: 'active' | 'running';
    /** When provided, each option-backed step gets an Edit affordance; Save calls
     *  this with the revised value. The host persists + refreshes (D2). */
    onRevise?: (step: string, value: unknown) => void | Promise<void>;
    /** Step ids whose validity shifted after a revise — shown with a revisit flag. */
    flagged?: string[];
    /** Click a decision card to navigate the wizard to that step. Forward-jump
     *  and backward-jump go through the same code path. Host wires this to the
     *  /devshell/navigate-to-step endpoint + view='build' switch. */
    onNavigateToStep?: (step: string) => void;
    /** Steps that need a (new) answer after a cascading revise. Renders an
     *  amber outline on the decision log card so the dev sees what to revisit. */
    pendingRevisitSteps?: string[];
    /** Steps whose entire decision was cleared by an upstream revise (e.g.
     *  switching tenancy to single-user clears roles). Renders grayed out so
     *  the dev sees what's no longer applicable. */
    clearedSteps?: string[];
}
export declare function DecisionLogPanel({ stages, variant, onRevise, flagged, onNavigateToStep, pendingRevisitSteps, clearedSteps, }: DecisionLogPanelProps): React.ReactElement;
export default DecisionLogPanel;
