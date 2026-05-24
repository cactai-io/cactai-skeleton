import type { ProjectPersonalityAssignment, ProjectPersonalityPatch } from '@cactai-io/types';
export interface PersonalityPickerPanelProps {
    active_id: string;
    available: ProjectPersonalityAssignment[];
    onConfirm: (patch: ProjectPersonalityPatch) => Promise<void>;
    onOpenEditor: (id: string) => void;
    onCreate?: () => void;
}
export declare function PersonalityPickerPanel({ active_id, available, onConfirm, onOpenEditor, onCreate, }: PersonalityPickerPanelProps): import("react/jsx-runtime").JSX.Element;
