import type { ProjectWorkflowResponse, ProjectWorkflowPatch } from '@cactai-io/types';
export interface WorkflowSectionProps {
    response: ProjectWorkflowResponse;
    onPatch: (patch: ProjectWorkflowPatch) => Promise<void>;
    marketplaceUrl?: string;
}
export declare function WorkflowSection({ response, onPatch, marketplaceUrl }: WorkflowSectionProps): import("react/jsx-runtime").JSX.Element;
