export interface OnboardingModalProps {
    open: boolean;
    onClose: () => void;
    /** 'modal' for the auto-triggered welcome appearance; 'docked' for
     *  every ⓘ-button click. Defaults to 'docked' for back-compat. */
    mode?: 'modal' | 'docked';
    /** Dynamic personality display name. Falls back to 'Ember' while loading. */
    personalityName?: string;
    /** True after workflow_step transitions to 'complete'. Appends the
     *  deployment section to the docked-panel copy. Ignored when
     *  mode='modal' — the workflow-completion auto-modal has its own
     *  component (WorkflowCompletionModal). */
    workflowComplete?: boolean;
}
export declare function OnboardingModal({ open, onClose, mode, personalityName, workflowComplete, }: OnboardingModalProps): import("react/jsx-runtime").JSX.Element | null;
