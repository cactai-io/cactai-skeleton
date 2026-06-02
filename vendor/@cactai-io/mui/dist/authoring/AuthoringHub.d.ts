import { type AuthoringType } from './AuthoringInterface.js';
export interface AuthoringHubProps {
    /** Tool currently open, or null to show the picker. Owned by DevShell. */
    activeType: AuthoringType | null;
    /** Open a tool from the picker grid. */
    onSelectType: (type: AuthoringType) => void;
    /** Return from an open tool back to the picker grid. */
    onBack: () => void;
}
export declare function AuthoringHub({ activeType, onSelectType, onBack }: AuthoringHubProps): import("react/jsx-runtime").JSX.Element;
