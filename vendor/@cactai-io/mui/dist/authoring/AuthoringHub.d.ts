import { type AuthoringType } from './AuthoringInterface.js';
export interface AuthoringHubProps {
    /** Tool currently open, or null to show the picker. Owned by DevShell. */
    activeType: AuthoringType | null;
    /** Open a tool from the picker grid. */
    onSelectType: (type: AuthoringType) => void;
    /** Return from an open tool back to the picker grid. */
    onBack: () => void;
    /** Injects an AI-assist prompt into the agent chat (host → submitInput). */
    onAssist?: (prompt: string) => void;
}
export declare function AuthoringHub({ activeType, onSelectType, onBack, onAssist }: AuthoringHubProps): import("react/jsx-runtime").JSX.Element;
