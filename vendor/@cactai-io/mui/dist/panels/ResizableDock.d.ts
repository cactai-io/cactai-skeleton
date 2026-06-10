import { type ReactNode } from 'react';
export interface ResizableDockProps {
    /** Per-project key for localStorage so each project remembers its dock shape. */
    projectId: string;
    /** Short label shown vertically when collapsed. Defaults to "Decisions". */
    label?: string;
    /** Default width when no prior state. */
    defaultWidth?: number;
    /** Min/max clamp. */
    minWidth?: number;
    maxWidth?: number;
    children: ReactNode;
}
export declare function ResizableDock({ projectId, label, defaultWidth, minWidth, maxWidth, children, }: ResizableDockProps): import("react/jsx-runtime").JSX.Element;
