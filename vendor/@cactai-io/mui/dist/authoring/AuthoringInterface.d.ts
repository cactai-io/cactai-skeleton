export type AuthoringType = 'tool' | 'skill' | 'agent' | 'personality' | 'character';
export interface AuthoringInterfaceProps {
    type: AuthoringType;
    /** Optional cancel/back affordance (host renders the surrounding chrome). */
    onCancel?: () => void;
}
export declare function AuthoringInterface({ type, onCancel }: AuthoringInterfaceProps): import("react/jsx-runtime").JSX.Element;
