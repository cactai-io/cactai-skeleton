export type AuthoringType = 'tool' | 'skill' | 'agent' | 'personality' | 'character';
export interface AuthoringInterfaceProps {
    type: AuthoringType;
    /** Optional cancel/back affordance (host renders the surrounding chrome). */
    onCancel?: () => void;
    /** Injects a composed prompt into the agent chat (host → shell.submitInput).
     *  When omitted, the AI-assist buttons are disabled. */
    onAssist?: (prompt: string) => void;
}
export declare function AuthoringInterface({ type, onCancel, onAssist }: AuthoringInterfaceProps): import("react/jsx-runtime").JSX.Element;
