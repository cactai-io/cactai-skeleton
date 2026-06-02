export interface UpdateAvailableModalProps {
    open: boolean;
    onClose: () => void;
    currentPlatformSha?: string | null;
    latestPlatformSha?: string;
    /** Called when the user clicks Apply. Should hit
     *  /api/devshell/update and return the parsed response. */
    onApply: () => Promise<UpdateApplyResponse>;
}
export interface UpdateApplyResponse {
    ok: boolean;
    pr_url?: string;
    pr_number?: number;
    branch?: string;
    files_changed?: number;
    error?: string;
    already_up_to_date?: boolean;
}
export declare function UpdateAvailableModal({ open, onClose, currentPlatformSha, latestPlatformSha, onApply, }: UpdateAvailableModalProps): import("react/jsx-runtime").JSX.Element | null;
