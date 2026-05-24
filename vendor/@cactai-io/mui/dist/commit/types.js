// packages/mui/src/commit/types.ts
// Shared types for the DevShell commit feature.
//
// v1.2 commit-flow rebuild: the 'main' SyncState variant is gone. Developers
// merge dev to main manually in GitHub; the DevShell no longer has any
// concept of a main-synced state. The two representable states are:
//
//   { branch: 'local'; uncommittedFiles: [...] }   — pending edits exist
//   { branch: 'dev'; synced: true }                — working state matches dev
//
// Both surfaces — the SyncIndicator and the PendingEditsModal — read off this
// shape. The per-file PendingFileSummary gains an `operation` field so the
// modal, the file tree, and the discard logic can distinguish between edit /
// create / delete / rename / move.
// Helpers used by the indicator, the modal, and the file-tree overlay so
// every surface agrees about what each state means.
export function isLocal(state) {
    return state.branch === 'local';
}
export function isSyncedToDev(state) {
    return state.branch === 'dev';
}
export function pendingCount(state) {
    return isLocal(state) ? state.uncommittedFiles.length : 0;
}
// Two-state indicator text. Format: `<branch> · <status>`.
//   local · 3 uncommitted
//   dev · synced
export function formatSyncLabel(state) {
    if (isLocal(state)) {
        const n = state.uncommittedFiles.length;
        return `local · ${n} uncommitted`;
    }
    return 'dev · synced';
}
// Build a SyncState from raw inputs. The shell calls this whenever the
// pending set changes — after a flush, after a commit, after a discard.
//
// Note the dropped `lastCommittedBranch` argument: with the main variant
// gone, the only thing that decides between 'local' and 'dev' is whether
// any files are pending.
export function deriveSyncState(args) {
    if (args.uncommittedFiles.length > 0) {
        return { branch: 'local', uncommittedFiles: args.uncommittedFiles };
    }
    return { branch: 'dev', synced: true };
}
export function previewBehaviorFor(path) {
    if (path === 'skeleton.config.json')
        return 'live';
    if (path.startsWith('config/theme/'))
        return 'live';
    if (path.startsWith('config/design/'))
        return 'live';
    return 'needs_deploy';
}
//# sourceMappingURL=types.js.map