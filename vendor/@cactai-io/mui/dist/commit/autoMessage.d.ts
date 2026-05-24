export type PendingOperation = 'edit' | 'create' | 'delete' | 'rename' | 'move';
export interface AutoMessagePendingFile {
    path: string;
    /** New path for rename/move ops. */
    new_path?: string | null;
    operation: PendingOperation;
}
/** Generate a commit message for a batch of pending files. */
export declare function autoGenerateCommitMessage(files: AutoMessagePendingFile[]): string;
