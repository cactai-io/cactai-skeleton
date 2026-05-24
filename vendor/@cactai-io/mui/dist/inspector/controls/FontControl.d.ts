import type { BaseControlProps } from './types.js';
export interface FontControlProps extends BaseControlProps<string> {
    /**
     * Called when the dev adds a custom font name. Receives the family name
     * only — the dev is responsible for the @font-face declaration in
     * globals.css. The inspector writes that file separately.
     */
    onAddCustomFont?: (familyName: string) => void;
}
export declare function FontControl({ path, value, locked, onChange, onAddCustomFont, }: FontControlProps): import("react/jsx-runtime").JSX.Element;
