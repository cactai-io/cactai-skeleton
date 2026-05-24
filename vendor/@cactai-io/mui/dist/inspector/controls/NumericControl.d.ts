import type { BaseControlProps } from './types.js';
export interface NumericControlProps extends BaseControlProps<number | string> {
    /** Slider min / max — defaults pick a band sensible for the unit. */
    min?: number;
    max?: number;
}
export declare function NumericControl({ path, value, locked, onChange, min, max, }: NumericControlProps): import("react/jsx-runtime").JSX.Element;
