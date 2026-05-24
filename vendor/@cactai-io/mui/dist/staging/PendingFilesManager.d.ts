import type { PendingFile, PendingOperation } from '@cactai-io/types';
export declare function diffLineCounts(original: string | null, current: string | null): {
    lines_added: number;
    lines_removed: number;
};
export interface PendingFilesManagerInit {
    projectId: string;
    fetchFn?: typeof fetch;
    now?: () => number;
}
export interface SetPendingFileOpts {
    operation: PendingOperation;
    new_path?: string | null;
    original_content?: string | null;
    immediate?: boolean;
}
type Listener = (snapshot: PendingFile[]) => void;
type CrossTabListener = (next: PendingFile | null, prev: PendingFile | null) => void;
export declare class PendingFilesManager {
    private projectId;
    private fetchFn;
    private now;
    private rows;
    private state;
    private listeners;
    private crossTabPaths;
    private storageHandler;
    private unloadHandlers;
    private disposed;
    constructor(init: PendingFilesManagerInit);
    /** Snapshot of all currently pending rows for this project. */
    getPendingFiles(): PendingFile[];
    /** Look up a single row by path; null if nothing pending at that path. */
    getPendingFile(path: string): PendingFile | null;
    /**
     * Stage a write. Updates localStorage and the in-memory view synchronously;
     * schedules a Supabase flush (debounced unless `opts.immediate`).
     *
     * For operation === 'delete' the caller passes content === null. For
     * operation === 'rename' / 'move' the caller passes opts.new_path and the
     * file's original content; current_content is the same content moved to
     * the new path.
     *
     * Callers MUST supply `opts.original_content` on the first edit to a
     * given path (it's the dev-branch content the local edit is diffing
     * against). On subsequent edits to the same path the manager preserves
     * the original_content already on the row — callers can omit
     * opts.original_content. For operation === 'create' the original_content
     * is null (the file doesn't exist on dev yet).
     *
     * Auto-empty-diff: if the resulting row has zero added and zero removed
     * lines AND the operation is 'edit', the path is discarded instead of
     * staged.
     */
    setPendingFile(path: string, content: string | null, opts: SetPendingFileOpts): void;
    /**
     * Discard a pending row. Per operation type:
     *   edit   — current_content := original_content; recompute diff;
     *            with diff zero, evict the row.
     *   create — remove the row entirely. (The file disappears from the
     *            tree from this client's perspective.)
     *   delete — remove the row entirely. (The file returns to clean state.)
     *   rename — remove the row. (File returns to its original path.)
     *   move   — same as rename.
     *
     * In every case the local state clears synchronously. The server-side
     * DELETE is serialized through the per-path in-flight latch: if a flush
     * is currently in flight for the same path, the DELETE waits for it to
     * resolve before going out. This prevents a race where the POST arrives
     * after the DELETE and resurrects the row on the server.
     */
    discardPendingFile(path: string): void;
    /** Discard every pending row. Used by the modal's "Discard all" affordance. */
    discardAll(): void;
    /**
     * Flush all dirty rows to Supabase right now. Returns a promise that
     * resolves when every in-flight flush has settled. Used by the commit
     * route before it constructs the multi-file commit body, and by callers
     * that need durability guarantees before a navigation.
     *
     * This does not include rows that are already clean (no debounce timer
     * pending). It only forces flushes for rows that are dirty.
     */
    flushDirty(): Promise<void>;
    /**
     * Subscribe to every change in the pending set. The listener fires after
     * each set / discard with the full snapshot. The modal and the file
     * tree both use this so they re-render when pending rows arrive from
     * any source — including peer tabs via the storage event.
     */
    subscribe(listener: Listener): () => void;
    /**
     * Subscribe to cross-tab writes for a specific path. The callback fires
     * when a peer tab updates the localStorage entry for this path; it
     * receives the new row (or null if the peer discarded) and the previous
     * row in this tab.
     *
     * Used by Task 11's Monaco editor to render the "This file is being
     * edited in another tab. Reload to see those changes or continue editing
     * here." banner when the path currently open in the editor is touched
     * by a peer.
     */
    subscribeCrossTab(path: string, listener: CrossTabListener): () => void;
    /**
     * Replace the in-memory view with the server's snapshot. Called once
     * on mount (the DevShell fetches /api/pending/files and hands the
     * result here) so a fresh browser sees rows committed from another
     * device.
     *
     * Server rows trump local — if the server says path X has operation
     * 'edit' with lines_added 12 but localStorage says lines_added 14, the
     * server number wins. The reverse (locally newer than server) is
     * tolerable: localStorage's row will trigger a flush at the next edit
     * and the server will be brought back into sync.
     */
    hydrate(serverRows: PendingFile[]): void;
    /** Release listeners and timers. Used by tests and on unmount. */
    dispose(): void;
    private getOrCreateState;
    private scheduleDebounce;
    private cancelDebounce;
    private flushPath;
    private drainQueued;
    private writeLocalStorage;
    private removeLocalStorage;
    private rehydrateFromLocalStorage;
    private onStorageEvent;
    private beaconFlush;
    private runServerDelete;
    private notifyListeners;
}
export declare function setActivePendingFilesManager(m: PendingFilesManager | null): void;
export declare function getActivePendingFilesManager(): PendingFilesManager | null;
export {};
