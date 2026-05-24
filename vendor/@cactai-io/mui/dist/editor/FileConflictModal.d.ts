import type { PendingFilesManagerLike } from './MonacoFileEditor.js';
export interface FileConflictModalProps {
    path: string;
    pendingFilesManager: PendingFilesManagerLike;
    /** Fetch override for the Supabase /api/pending/files lookup. Defaults
     *  to global fetch. */
    fetchFn?: typeof fetch;
    /** Called after a resolution path completes successfully. */
    onResolved: () => void;
    /** Called when the developer hits Cancel. */
    onCancel: () => void;
}
export declare function FileConflictModal({ path, pendingFilesManager, fetchFn, onResolved, onCancel, }: FileConflictModalProps): import("react/jsx-runtime").JSX.Element;
