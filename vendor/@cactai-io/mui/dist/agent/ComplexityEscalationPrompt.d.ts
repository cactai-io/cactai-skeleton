import type { JSX } from 'react';
export type EscalationChoice = 'opus' | 'sonnet';
export interface ComplexityEscalationPromptProps {
    /** Threshold-trip reasons from checkMigrationComplexity. Surfaced as
     *  bullets so the developer understands why escalation was suggested. */
    reasons: string[];
    /** Called when the developer picks. The host forwards the choice to
     *  the dispatcher's resolveEscalation callback (via a long-poll, SSE
     *  channel, or RPC — Phase 14 ships the UI; the wire mechanism is
     *  the orchestrator's responsibility). */
    onResolve: (choice: EscalationChoice) => void;
    /** Optional explicit dismissal — sometimes the developer wants to
     *  abort the dispatch instead of choosing a tier. When omitted, the
     *  panel has no dismiss button (the dispatcher will still proceed
     *  with the saved-default tier after a timeout in the carry-forward). */
    onAbort?: () => void;
}
export declare function ComplexityEscalationPrompt(props: ComplexityEscalationPromptProps): JSX.Element;
