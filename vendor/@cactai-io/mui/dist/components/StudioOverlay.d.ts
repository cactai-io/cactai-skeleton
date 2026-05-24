import type { ReactNode } from 'react';
export interface InspectorCapture {
    skill_id: string;
    element_path: string;
    props: unknown;
}
export interface StudioOverlayProps {
    skill_id: string;
    children: ReactNode;
    onInspect: (capture: InspectorCapture) => void;
    active: boolean;
    accent_color?: string;
}
export declare function StudioOverlay({ skill_id, children, onInspect, active, accent_color, }: StudioOverlayProps): import("react/jsx-runtime").JSX.Element;
