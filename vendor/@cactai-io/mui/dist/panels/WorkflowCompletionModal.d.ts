export interface WorkflowCompletionModalProps {
    open: boolean;
    onClose: () => void;
    githubRepoUrl?: string;
    productionUrl?: string;
}
export declare function WorkflowCompletionModal({ open, onClose, githubRepoUrl, productionUrl, }: WorkflowCompletionModalProps): import("react/jsx-runtime").JSX.Element | null;
