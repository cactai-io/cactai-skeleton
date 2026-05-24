import type { ProjectBYOKResponse, ProjectBYOKPatch } from '@cactai-io/types';
export interface BYOKSectionProps {
    response: ProjectBYOKResponse;
    onPatch: (patch: ProjectBYOKPatch) => Promise<void>;
    providers?: Array<{
        id: string;
        label: string;
        placeholder: string;
    }>;
}
export declare function BYOKSection({ response, onPatch, providers }: BYOKSectionProps): import("react/jsx-runtime").JSX.Element;
