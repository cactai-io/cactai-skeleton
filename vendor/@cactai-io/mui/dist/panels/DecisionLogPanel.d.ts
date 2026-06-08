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
}
export declare function DecisionLogPanel({ stages, variant, onRevise, flagged }: DecisionLogPanelProps): React.ReactElement;
export default DecisionLogPanel;
