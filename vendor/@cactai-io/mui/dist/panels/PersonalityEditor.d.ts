import type { DevAuthoredPersonalityRecord, DevAuthoredPersonalityEditPatch, ProductPersonality } from '@cactai-io/types';
export interface PersonalityEditorProps {
    id: string;
    onLoad: (id: string) => Promise<DevAuthoredPersonalityRecord | null>;
    onSave: (id: string, patch: DevAuthoredPersonalityEditPatch) => Promise<DevAuthoredPersonalityRecord>;
    onTest: (definition: ProductPersonality, prompt?: string) => Promise<string>;
    onClose: () => void;
}
export declare function PersonalityEditor({ id, onLoad, onSave, onTest, onClose }: PersonalityEditorProps): import("react/jsx-runtime").JSX.Element | null;
