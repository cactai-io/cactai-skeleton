import type { PendingOperation } from '@cactai-io/types';
export type ConflictReason = 'remote_changed' | 'create_collision' | 'delete_remote_moved' | 'rename_source_moved' | 'rename_dest_taken';
export interface ConflictFile {
    path: string;
    operation: PendingOperation;
    new_path: string | null;
    local_content: string | null;
    base_content: string | null;
    remote_content: string | null;
    remote_sha: string | null;
    reason: ConflictReason;
}
/**
 * Thrown by the host's `onCommitToDev` implementation when the
 * /api/github/commit route returns 409. The DevShell catches this
 * specifically and opens the CommitConflictModal with the carried
 * `files` payload. Any other error type is surfaced as the inline
 * commit-error banner in PendingEditsModal as before.
 *
 * Host code that doesn't want to participate in conflict resolution
 * can simply not throw this class — the existing inline-error path
 * still works. Hosts that do want the modal flow construct the error
 * as `new CommitConflictError(files)` and throw.
 */
export declare class CommitConflictError extends Error {
    readonly files: ConflictFile[];
    constructor(files: ConflictFile[], message?: string);
}
export type Resolution = {
    kind: 'keep_local';
} | {
    kind: 'keep_remote';
} | {
    kind: 'manual';
    content: string;
};
export interface CommitConflictModalProps {
    files: ConflictFile[];
    /** Inline error from a previous retry. Cleared by the parent before
     *  the next attempt. */
    error?: string | null;
    /** True while the resolved retry is in flight. Disables interaction. */
    submitting?: boolean;
    onSubmit: (resolutions: Map<string, Resolution>) => void;
    onCancel: () => void;
}
export declare function CommitConflictModal({ files, error, submitting, onSubmit, onCancel, }: CommitConflictModalProps): import("react/jsx-runtime").JSX.Element;
