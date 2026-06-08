import React from 'react';
export interface KeyInputProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    /** Start obscured — for a programmatically-inserted known key (e.g. the
     *  DevShell key auto-filled by a checkbox). The dev never typed it, so there
     *  is nothing to validate; it ships masked with an eye to peek. */
    startObscured?: boolean;
    /** Fired when the field commits (blur with a non-empty value). */
    onCommit?: (v: string) => void;
    disabled?: boolean;
    ariaLabel?: string;
    style?: React.CSSProperties;
    inputStyle?: React.CSSProperties;
    /** Applied to the inner <input> — lets host surfaces reuse their own input
     *  class (e.g. the dashboard's `cactai-input`) for consistent styling. */
    className?: string;
}
export declare function KeyInput({ value, onChange, placeholder, startObscured, onCommit, disabled, ariaLabel, style, inputStyle, className, }: KeyInputProps): React.ReactElement;
export default KeyInput;
