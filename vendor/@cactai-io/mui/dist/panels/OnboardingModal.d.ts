export interface OnboardingModalProps {
    open: boolean;
    onClose: () => void;
    /** Dynamic personality display name. Falls back to 'Ember' while loading. */
    personalityName?: string;
    /** True after workflow_step transitions to 'complete'. Appends the
     *  deployment section to the modal copy. */
    workflowComplete?: boolean;
}
export declare function OnboardingModal({ open, onClose, personalityName, workflowComplete, }: OnboardingModalProps): import("react/jsx-runtime").JSX.Element | null;
