import type { PendingFile, PendingOperation } from '@cactai-io/types';
export interface PendingFilesManagerLike {
    getPendingFile(path: string): PendingFile | null;
    setPendingFile(path: string, content: string | null, opts: {
        operation: PendingOperation;
        new_path?: string | null;
        original_content?: string | null;
        immediate?: boolean;
    }): void;
    subscribeCrossTab(path: string, listener: (next: PendingFile | null, prev: PendingFile | null) => void): () => void;
}
export interface OpenTab {
    path: string;
    /** Whatever the editor should show on first mount. The component
     *  computes the current_content from the manager when present and
     *  falls back to original_content when not. */
    original_content: string;
    /** Set to true when the path is a brand-new file (operation 'create'
     *  on the staging layer). The save flow uses this to pick the right
     *  operation tag on setPendingFile. */
    is_new: boolean;
}
export interface MonacoFileEditorProps {
    /** Tabs the editor is currently rendering. The parent (DevShell)
     *  manages opening and closing; this prop drives which tabs are
     *  visible. */
    openTabs: ReadonlyArray<OpenTab>;
    /** Path of the active tab. Must be one of openTabs[].path. */
    activePath: string | null;
    /** Manager singleton — staging layer used for every save. */
    pendingFilesManager: PendingFilesManagerLike;
    /** Activate a different tab. */
    onActivate: (path: string) => void;
    /** Close a tab. The parent removes the entry from openTabs and
     *  picks the next active path. */
    onClose: (path: string) => void;
    /** Optional fetch override for the conflict modal's Supabase
     *  comparison. Defaults to global fetch. */
    fetchFn?: typeof fetch;
}
export declare function MonacoFileEditor({ openTabs, activePath, pendingFilesManager, onActivate, onClose, fetchFn, }: MonacoFileEditorProps): import("react/jsx-runtime").JSX.Element;
export type { OpenTab as MonacoOpenTab };
