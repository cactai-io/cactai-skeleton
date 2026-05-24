// packages/mui/src/commit/commitClient.ts
//
// Thread 11 + Thread 12 — host-agnostic helpers for talking to the
// skeleton's /api/github/commit and /api/github/revert/[sha] routes.
//
// The DevShell receives `onCommitToDev` and `onRevertCommit` as props,
// so the actual network call is the host's responsibility. These
// helpers consolidate the request-body shaping and the 409 → throw
// CommitConflictError path so every host (the Cactai platform DevShell
// shim today, third-party IDEs that embed @cactai-io/mui tomorrow) gets
// the same wire-format behavior with no copy-paste drift.
//
// Both helpers are pure functions over (paths, manager, options) →
// HTTP. They don't touch React, don't subscribe to anything, and have
// no module-scope state.
import { CommitConflictError, } from './CommitConflictModal.js';
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
export function buildCommitBody(args) {
    const { paths, manager, message, options } = args;
    // Revert path: caller has pre-built the inverse file set. Pass
    // through verbatim with the message and reverts_sha attached.
    if (options?.fileSet && options.fileSet.length > 0) {
        return {
            files: options.fileSet.map(f => ({
                path: f.path,
                operation: f.operation,
                new_path: f.new_path ?? null,
                content: f.content ?? null,
                last_edited_at: f.last_edited_at,
                lines_added: f.lines_added,
                lines_removed: f.lines_removed,
            })),
            message: options.message ?? message,
            reverts_sha: options.reverts_sha ?? null,
        };
    }
    // Normal path: resolve each input path against the staging manager.
    // Throws if a path has no pending row — that means the caller asked
    // to commit a file that isn't actually pending, which is a bug.
    const files = [];
    for (const path of paths) {
        const row = manager.getPendingFile(path);
        if (!row) {
            throw new Error(`buildCommitBody: no pending row for '${path}'`);
        }
        let content = row.current_content;
        // Apply per-path resolution overrides from the conflict modal.
        const resolution = options?.resolutions?.get(path);
        if (resolution) {
            switch (resolution.kind) {
                case 'keep_local': /* no change */ break;
                case 'manual':
                    content = resolution.content;
                    break;
                case 'keep_remote': /* caller should have dropped path */
                    // Defensive — if a keep_remote slipped through, encode it
                    // as "no content change at this path" which the server will
                    // reject anyway. The DevShell filters keep_remote paths
                    // before invoking this helper.
                    break;
            }
        }
        files.push({
            path: row.path,
            operation: row.operation,
            new_path: row.new_path ?? null,
            content: row.operation === 'delete' ? null : (content ?? null),
            last_edited_at: row.last_edited_at,
            lines_added: row.lines_added,
            lines_removed: row.lines_removed,
        });
    }
    return {
        files,
        message: options?.message ?? message,
        // resolved=true tells the server to skip the pre-flight conflict
        // pass. Without resolutions we omit the flag so the next attempt
        // re-checks.
        resolved: options?.resolutions ? true : undefined,
        reverts_sha: options?.reverts_sha ?? null,
    };
}
/**
 * Send a commit body to /api/github/commit and route the response:
 *   200 → resolve
 *   409 → throw CommitConflictError with the parsed files
 *   anything else → throw Error with the route's `detail` if any.
 *
 * The `simulateConflict` flag appends `?simulateCommitConflict=1` to
 * the URL — honored only by the dev build of the route.
 */
export async function sendCommit(body, options) {
    const fetcher = options?.fetchFn ?? ((...a) => fetch(...a));
    const base = options?.baseUrl ?? '';
    const qs = options?.simulateConflict ? '?simulateCommitConflict=1' : '';
    const res = await fetcher(`${base}/api/github/commit${qs}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        throw new CommitConflictError(data.files ?? [], data.message ?? 'Commit conflict detected');
    }
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const reason = data?.detail
            ? `${data?.error ?? 'commit_failed'}: ${typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)}`
            : (data?.error ?? `Commit failed (HTTP ${res.status})`);
        throw new Error(reason);
    }
    return (await res.json());
}
// ────────────────────────────────────────────────────────────────────────────
// Thread 12 — revert helpers.
// ────────────────────────────────────────────────────────────────────────────
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
export function buildRevertFileSet(commitFiles, nowIso = new Date().toISOString()) {
    const out = [];
    for (const f of commitFiles) {
        switch (f.operation) {
            case 'edit': {
                out.push({
                    path: f.path,
                    operation: 'edit',
                    new_path: null,
                    content: f.original_content ?? '',
                    last_edited_at: nowIso,
                    lines_added: f.lines_removed,
                    lines_removed: f.lines_added,
                });
                break;
            }
            case 'create': {
                out.push({
                    path: f.path,
                    operation: 'delete',
                    new_path: null,
                    content: null,
                    last_edited_at: nowIso,
                    lines_added: 0,
                    lines_removed: f.lines_added,
                });
                break;
            }
            case 'delete': {
                out.push({
                    path: f.path,
                    operation: 'create',
                    new_path: null,
                    content: f.original_content ?? '',
                    last_edited_at: nowIso,
                    lines_added: f.lines_removed,
                    lines_removed: 0,
                });
                break;
            }
            case 'rename':
            case 'move': {
                // The original commit went path → new_path. Inverse is
                // new_path → path. We don't ship a content change in the
                // inverse rename; the destination's content equals the source
                // it's moving back to, which is whatever current_content was
                // on the original commit.
                if (!f.new_path)
                    continue; // defensive — malformed snapshot
                out.push({
                    path: f.new_path,
                    operation: f.operation,
                    new_path: f.path,
                    content: f.current_content ?? '',
                    last_edited_at: nowIso,
                    lines_added: f.lines_removed,
                    lines_removed: f.lines_added,
                });
                break;
            }
        }
    }
    return out;
}
/** Default commit message for the revert flow. */
export function defaultRevertMessage(commit) {
    return `Revert "${commit.message}"`;
}
//# sourceMappingURL=commitClient.js.map