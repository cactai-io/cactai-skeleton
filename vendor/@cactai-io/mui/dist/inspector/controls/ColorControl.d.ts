import type { BaseControlProps } from './types.js';
export interface ColorControlProps extends BaseControlProps<string> {
    /** Other color tokens available to copy from. Path → current value. */
    siblings?: Array<{
        path: string;
        value: string;
    }>;
}
export declare function ColorControl({ path, value, locked, onChange, siblings, }: ColorControlProps): import("react/jsx-runtime").JSX.Element;
