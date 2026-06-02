export interface OnboardingModalProps {
    open: boolean;
    onClose: () => void;
    /** Dynamic personality display name. Falls back to 'Ember' while loading. */
    personalityName?: string;
}
export declare function OnboardingModal({ open, onClose, personalityName, }: OnboardingModalProps): import("react/jsx-runtime").JSX.Element | null;
