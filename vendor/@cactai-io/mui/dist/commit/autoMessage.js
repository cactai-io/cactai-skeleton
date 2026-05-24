// packages/mui/src/commit/autoMessage.ts
// Auto-generated commit message logic (Gap 127). Pure functions over a
// list of pending files. Used by PendingEditsModal as the default value
// for the commit-message inline input.
//
// Heuristic from devshell-directory-viewer.md "Commit Panel":
//   1 file:                   "Update <filename>"
//   2-3 files:                "Update <file1>, <file2>[, <file3>]"
//   4+ files, one directory:  "Update <directory> files"
//   4+ files, mixed dirs:     "Update N files"
//
// Special-cases:
//   - Pure-create batch        → "Add <name(s)>"
//   - Pure-delete batch        → "Remove <name(s)>"
//   - Mixed ops with > 1 file  → "Update N files"
//   - Rename-only batch        → "Rename <old> → <new>" (single) or
//                                "Rename N files"
const MAX_LIST_FILES = 3;
/** Generate a commit message for a batch of pending files. */
export function autoGenerateCommitMessage(files) {
    if (files.length === 0)
        return 'Update files';
    // Classify by operation set.
    const ops = new Set(files.map(f => f.operation));
    const allCreate = ops.size === 1 && ops.has('create');
    const allDelete = ops.size === 1 && ops.has('delete');
    const allRename = ops.size === 1 && (ops.has('rename') || ops.has('move'));
    if (files.length === 1) {
        const f = files[0];
        const name = basename(f.path);
        switch (f.operation) {
            case 'create': return `Add ${name}`;
            case 'delete': return `Remove ${name}`;
            case 'rename':
            case 'move': {
                const newName = f.new_path ? basename(f.new_path) : null;
                return newName && newName !== name
                    ? `Rename ${name} → ${newName}`
                    : `Move ${name}`;
            }
            default: return `Update ${name}`;
        }
    }
    if (files.length <= MAX_LIST_FILES) {
        const names = files.map(f => basename(f.path));
        if (allCreate)
            return `Add ${names.join(', ')}`;
        if (allDelete)
            return `Remove ${names.join(', ')}`;
        if (allRename)
            return `Rename ${names.length} files`;
        return `Update ${names.join(', ')}`;
    }
    // 4+ files. Check whether they share a common directory.
    const dirs = new Set(files.map(f => dirname(f.path)));
    if (dirs.size === 1) {
        const dir = [...dirs][0];
        const dirLabel = dir === '' ? 'root' : dir;
        if (allCreate)
            return `Add ${files.length} files in ${dirLabel}`;
        if (allDelete)
            return `Remove ${files.length} files in ${dirLabel}`;
        return `Update ${dirLabel} files`;
    }
    if (allCreate)
        return `Add ${files.length} files`;
    if (allDelete)
        return `Remove ${files.length} files`;
    if (allRename)
        return `Rename ${files.length} files`;
    return `Update ${files.length} files`;
}
// ── String helpers ──────────────────────────────────────────────────────
function basename(p) {
    const i = p.lastIndexOf('/');
    return i === -1 ? p : p.slice(i + 1);
}
function dirname(p) {
    const i = p.lastIndexOf('/');
    return i === -1 ? '' : p.slice(0, i);
}
//# sourceMappingURL=autoMessage.js.map