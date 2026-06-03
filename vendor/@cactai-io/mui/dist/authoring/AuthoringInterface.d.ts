export type AuthoringType = 'tool' | 'skill' | 'agent' | 'personality' | 'character';
export interface AuthoringInterfaceProps {
    type: AuthoringType;
    /** Optional cancel/back affordance (host renders the surrounding chrome). */
    onCancel?: () => void;
    /** Injects a composed prompt into the agent chat (host → shell.submitInput).
     *  When omitted, the AI-assist buttons are disabled. */
    onAssist?: (prompt: string) => void;
    /** Saves the authored artifact — the host composes the project-library file(s)
     *  and commits them to dev. Returns ok + the written path, or an error.
     *  When omitted, the Save button is disabled. */
    onSave?: (type: AuthoringType, values: Record<string, string>) => Promise<{
        ok: boolean;
        error?: string;
        path?: string;
    }>;
}
export declare function AuthoringInterface({ type, onCancel, onAssist, onSave }: AuthoringInterfaceProps): import("react/jsx-runtime").JSX.Element;
