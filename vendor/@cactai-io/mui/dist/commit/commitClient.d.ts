import type { PendingFile, PendingOperation } from '@cactai-io/types';
import { type Resolution } from './CommitConflictModal.js';
import type { CommitListItem, CommitFileItem } from './CommitHistoryModal.js';
export interface CommitClientPendingFilesLike {
    getPendingFiles(): PendingFile[];
    getPendingFile(path: string): PendingFile | null;
}
export interface CommitInvocationOptionsLike {
    resolutions?: Map<string, Resolution>;
    contentByPath?: Map<string, string | null>;
    fileSet?: ReadonlyArray<{
        path: string;
        operation: PendingOperation;
        new_path?: string | null;
        content?: string | null;
        last_edited_at: string;
        lines_added: number;
        lines_removed: number;
    }>;
    reverts_sha?: string;
    message?: string;
    simulateConflict?: boolean;
}
export interface CommitFileBody {
    path: string;
    operation: PendingOperation;
    new_path?: string | null;
    content?: string | null;
    last_edited_at: string;
    lines_added: number;
    lines_removed: number;
}
export interface CommitRequestBody {
    files: CommitFileBody[];
    message: string;
    resolved?: boolean;
    reverts_sha?: string | null;
}
/**
 * Build a /api/github/commit request body from a path set and the
 * staging manager. When `options.resolutions` is provided, the body's
 * per-file content is replaced with the resolved content (manual edits
 * win over local; keep_remote drops the file entirely — the caller
 * should filter the path set before calling this helper). When
 * `options.fileSet` is provided, it overrides path/manager resolution
 * entirely — used by the revert flow to commit pre-computed inverse
 * snapshots.
 */
export declare function buildCommitBody(args: {
    paths: string[];
    manager: CommitClientPendingFilesLike;
    message: string;
    options?: CommitInvocationOptionsLike;
}): CommitRequestBody;
/**
 * Send a commit body to /api/github/commit and route the response:
 *   200 → resolve
 *   409 → throw CommitConflictError with the parsed files
 *   anything else → throw Error with the route's `detail` if any.
 *
 * The `simulateConflict` flag appends `?simulateCommitConflict=1` to
 * the URL — honored only by the dev build of the route.
 */
export declare function sendCommit(body: CommitRequestBody, options?: {
    simulateConflict?: boolean;
    fetchFn?: typeof fetch;
    baseUrl?: string;
}): Promise<{
    commit_sha: string;
}>;
/**
 * Build the inverse file set for a revert from the original commit's
 * commit_log_files snapshots. The semantics, per operation:
 *
 *   edit   → write `original_content` back (swap current and original).
 *   create → delete the path.
 *   delete → re-create the path with `original_content` as its content.
 *   rename → move `new_path` back to the source `path`.
 *   move   → same as rename (the operations are equivalent at the file-
 *            tree level for v1.2 single-developer).
 *
 * The output is a CommitFileBody[] ready to feed into buildCommitBody
 * via `options.fileSet`. The caller decides the commit message; the
 * convention is `Revert "<original message>"` matching `git revert`.
 *
 * Line counts: we flip `lines_added` and `lines_removed` so the
 * pending-set view of the revert reflects the inverse change at a
 * glance. The server recomputes these against the actual blob after
 * the commit lands; this is just the staging-time approximation.
 */
export declare function buildRevertFileSet(commitFiles: CommitFileItem[], nowIso?: string): CommitFileBody[];
/** Default commit message for the revert flow. */
export declare function defaultRevertMessage(commit: CommitListItem): string;
