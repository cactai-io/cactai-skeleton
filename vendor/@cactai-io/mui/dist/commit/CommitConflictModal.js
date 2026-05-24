'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/commit/CommitConflictModal.tsx
//
// Thread 11 — commit-time conflict resolution modal.
//
// Distinct from FileConflictModal (which handles editor-open conflicts
// between this device's localStorage and another session's Supabase row).
// CommitConflictModal handles conflicts surfaced by the
// /api/github/commit route when dev has changed between the developer
// staging their edit and the server attempting the commit.
//
// UI shape:
//
//   Header
//     - "Conflict detected" title
//     - Subtitle describing the cause ("Files on dev have changed since
//       your local copy. Resolve before committing.")
//
//   File list
//     - One row per conflicting file. Each row shows path, the
//       conflict reason (compact wording), and the chosen resolution.
//     - Each row expands into a three-column preview: local | base |
//       remote (base column hidden for create / rename-dest-taken
//       cases where it isn't meaningful).
//     - Three resolution choices per file: "Keep local", "Keep remote",
//       "Resolve manually".
//
//   Manual resolution
//     - Decision: Monaco editor (Decision 4 / option B in the planning
//       Q&A). Mounted inline below the row when the developer picks
//       "Resolve manually". Pre-fills with the developer's local
//       content; remote and base are visible above the editor via the
//       DiffViewer for reference.
//
//   Footer
//     - "Cancel" — closes; pending edits remain unchanged.
//     - "Commit resolved" — only enabled when every file has a
//       resolution. Calls onSubmit with the resolved content per file.
//
// Failure model:
//   - If the retry commit also fails (including with another conflict),
//     the parent renders the error inline and reopens this modal with
//     the new file set. State of resolutions for files that haven't
//     drifted again is preserved.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DiffViewer, languageForPath } from '../diff/DiffViewer.js';
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
export class CommitConflictError extends Error {
    files;
    constructor(files, message = 'Commit conflict detected') {
        super(message);
        this.name = 'CommitConflictError';
        this.files = files;
    }
}
const LazyMonaco = lazy(() => import('@monaco-editor/react').then(m => ({ default: m.default })));
function reasonLabel(reason) {
    switch (reason) {
        case 'remote_changed': return 'dev changed this file';
        case 'create_collision': return 'a file already exists at this path on dev';
        case 'delete_remote_moved': return 'dev changed this file before you deleted it';
        case 'rename_source_moved': return 'dev changed the source file';
        case 'rename_dest_taken': return 'the new path is already taken on dev';
    }
}
function opBadge(op) {
    switch (op) {
        case 'edit': return 'edit';
        case 'create': return 'create';
        case 'delete': return 'delete';
        case 'rename': return 'renamed';
        case 'move': return 'moved';
    }
}
// "Keep remote" semantics by operation:
//   edit/delete    — drop the local change entirely, leave dev as-is.
//   create         — drop the create.
//   rename/move    — drop the rename; original source stays.
// The modal exposes "Keep remote" as a clear "discard my pending change
// for this file" — we encode that into the resolution map and the
// caller (the commit retry flow) drops the matching path from the
// file set before re-sending.
//
// "Keep local" semantics by operation:
//   edit           — commit local content, overwriting remote.
//   delete         — commit the delete, overwriting remote.
//   create         — commit the create, overwriting whatever dev now
//                    has at the path.
//   rename/move    — commit the rename to the new path, overwriting
//                    whatever dev now has there. The renamed source
//                    side uses the local content.
//
// "Manual" — only meaningful for cases where there's content on both
// sides (edit, create-collision, rename-source-moved, rename-dest-taken).
// For delete-remote-moved, manual is interpreted as "commit my edit
// with this content instead of deleting", which the resolved retry
// will surface to the developer if they want — for simplicity the
// modal hides "Resolve manually" on delete operations.
function manualAllowedFor(op) {
    return op !== 'delete';
}
export function CommitConflictModal({ files, error, submitting = false, onSubmit, onCancel, }) {
    // Per-file resolution state. Defaults: keep_local (the developer's
    // intent before the conflict was detected). The developer can flip
    // each row independently.
    const [resolutions, setResolutions] = useState(() => {
        const m = new Map();
        for (const f of files)
            m.set(f.path, { kind: 'keep_local' });
        return m;
    });
    // Per-file expanded state for the side-by-side preview.
    const [expanded, setExpanded] = useState(() => new Set(files.length === 1 ? [files[0].path] : []));
    // Per-file manual-editor open state. Independent of expanded so the
    // developer can collapse the preview while keeping the editor open.
    const [manualOpen, setManualOpen] = useState(new Set());
    const cancelRef = useRef(null);
    useEffect(() => {
        cancelRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape' && !submitting)
            onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel, submitting]);
    const setResolution = useCallback((path, r) => {
        setResolutions(prev => {
            const next = new Map(prev);
            next.set(path, r);
            return next;
        });
    }, []);
    const toggleExpand = useCallback((path) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(path))
                next.delete(path);
            else
                next.add(path);
            return next;
        });
    }, []);
    const openManual = useCallback((file) => {
        setManualOpen(prev => {
            const next = new Set(prev);
            next.add(file.path);
            return next;
        });
        // Seed manual content with local; the developer can rewrite from
        // there. If they cancel out of manual, the previous resolution is
        // preserved (we don't overwrite it on open).
        setResolutions(prev => {
            const next = new Map(prev);
            const existing = next.get(file.path);
            if (existing?.kind === 'manual')
                return next;
            next.set(file.path, { kind: 'manual', content: file.local_content ?? file.remote_content ?? '' });
            return next;
        });
        setExpanded(prev => new Set(prev).add(file.path));
    }, []);
    const closeManual = useCallback((path) => {
        setManualOpen(prev => {
            const next = new Set(prev);
            next.delete(path);
            return next;
        });
    }, []);
    const allResolved = useMemo(() => {
        for (const f of files) {
            const r = resolutions.get(f.path);
            if (!r)
                return false;
            if (r.kind === 'manual' && typeof r.content !== 'string')
                return false;
        }
        return true;
    }, [files, resolutions]);
    const handleSubmit = useCallback(() => {
        if (!allResolved || submitting)
            return;
        onSubmit(resolutions);
    }, [allResolved, submitting, onSubmit, resolutions]);
    return (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: (e) => { if (e.target === e.currentTarget && !submitting)
            onCancel(); }, children: _jsxs("div", { className: "ds-commit-modal-card ds-commit-conflict-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "ds-commit-conflict-title", children: [_jsx("div", { className: "ds-commit-modal-header", children: _jsxs("div", { className: "ds-commit-modal-titles", children: [_jsx("div", { id: "ds-commit-conflict-title", className: "ds-commit-modal-title", children: "Conflict detected" }), _jsx("div", { className: "ds-commit-modal-subtitle", children: "Files on dev have changed since your local copy. Resolve before committing." })] }) }), error && _jsx("div", { className: "ds-commit-modal-error", role: "alert", children: error }), _jsx("div", { className: "ds-commit-modal-body ds-commit-conflict-body", children: _jsx("ul", { className: "ds-commit-conflict-list", children: files.map(file => {
                            const isOpen = expanded.has(file.path);
                            const isManual = manualOpen.has(file.path);
                            const resolution = resolutions.get(file.path) ?? { kind: 'keep_local' };
                            const canManual = manualAllowedFor(file.operation);
                            const localExists = file.local_content !== null;
                            const remoteExists = file.remote_content !== null;
                            return (_jsxs("li", { className: "ds-commit-conflict-li", children: [_jsxs("div", { className: "ds-commit-conflict-row", "data-op": file.operation, children: [_jsx("button", { type: "button", className: "ds-commit-file-expand", onClick: () => toggleExpand(file.path), "aria-expanded": isOpen, "aria-label": isOpen ? 'Collapse preview' : 'Expand preview', children: isOpen ? '▾' : '▸' }), _jsx("span", { className: "ds-commit-file-path", children: file.new_path
                                                    ? _jsxs(_Fragment, { children: [_jsx("span", { className: "ds-commit-file-path-old", children: file.path }), ' → ', _jsx("span", { className: "ds-commit-file-path-new", children: file.new_path })] })
                                                    : file.path }), _jsx("span", { className: `ds-commit-op-badge ds-commit-op-badge--${file.operation}`, children: opBadge(file.operation) }), _jsx("span", { className: "ds-commit-conflict-reason", children: reasonLabel(file.reason) }), _jsxs("span", { className: "ds-commit-conflict-resolution-tag", children: [resolution.kind === 'keep_local' && (localExists ? 'using local' : 'use local (deletion)'), resolution.kind === 'keep_remote' && (remoteExists ? 'using remote' : 'use remote (absent)'), resolution.kind === 'manual' && 'manual edit'] })] }), isOpen && (_jsxs("div", { className: "ds-commit-conflict-preview", children: [file.local_content !== null && file.remote_content !== null ? (_jsx(DiffViewer, { path: file.path, operation: "edit", original: file.remote_content, current: file.local_content, initialMode: "split" })) : (_jsxs("div", { className: "ds-commit-conflict-preview-fallback", children: [file.local_content === null && (_jsxs("div", { className: "ds-commit-conflict-preview-side", children: [_jsx("div", { className: "ds-commit-conflict-preview-side-label", children: "Local" }), _jsx("div", { className: "ds-commit-conflict-preview-side-empty", children: "(file marked for deletion)" })] })), file.remote_content === null && (_jsxs("div", { className: "ds-commit-conflict-preview-side", children: [_jsx("div", { className: "ds-commit-conflict-preview-side-label", children: "Remote" }), _jsx("div", { className: "ds-commit-conflict-preview-side-empty", children: "(file does not exist on dev)" })] })), file.local_content !== null && (_jsxs("div", { className: "ds-commit-conflict-preview-side", children: [_jsx("div", { className: "ds-commit-conflict-preview-side-label", children: "Local" }), _jsx("pre", { children: file.local_content })] })), file.remote_content !== null && (_jsxs("div", { className: "ds-commit-conflict-preview-side", children: [_jsx("div", { className: "ds-commit-conflict-preview-side-label", children: "Remote" }), _jsx("pre", { children: file.remote_content })] }))] })), _jsxs("div", { className: "ds-commit-conflict-actions", children: [_jsx("button", { type: "button", className: resolution.kind === 'keep_local' ? 'ds-commit-modal-btn ds-commit-modal-btn-primary' : 'ds-commit-modal-btn', onClick: () => { setResolution(file.path, { kind: 'keep_local' }); closeManual(file.path); }, disabled: submitting, children: "Keep local" }), _jsx("button", { type: "button", className: resolution.kind === 'keep_remote' ? 'ds-commit-modal-btn ds-commit-modal-btn-primary' : 'ds-commit-modal-btn', onClick: () => { setResolution(file.path, { kind: 'keep_remote' }); closeManual(file.path); }, disabled: submitting, children: "Keep remote" }), canManual && (_jsx("button", { type: "button", className: resolution.kind === 'manual' ? 'ds-commit-modal-btn ds-commit-modal-btn-primary' : 'ds-commit-modal-btn', onClick: () => openManual(file), disabled: submitting, children: "Resolve manually" }))] }), isManual && resolution.kind === 'manual' && (_jsxs("div", { className: "ds-commit-conflict-manual", children: [_jsxs("div", { className: "ds-commit-conflict-manual-header", children: [_jsx("span", { children: "Manual resolution" }), _jsx("button", { type: "button", className: "ds-commit-modal-link", onClick: () => closeManual(file.path), children: "Close editor" })] }), _jsx(Suspense, { fallback: _jsx("div", { className: "ds-commit-modal-empty", children: "Loading editor\u2026" }), children: _jsx(LazyMonaco, { height: "320px", language: languageForPath(file.path), value: resolution.content, theme: "vs-dark", options: {
                                                                readOnly: submitting,
                                                                minimap: { enabled: false },
                                                                scrollBeyondLastLine: false,
                                                                fontFamily: 'var(--f-mono, ui-monospace, monospace)',
                                                                fontSize: 12,
                                                                automaticLayout: true,
                                                            }, onChange: (val) => setResolution(file.path, { kind: 'manual', content: val ?? '' }) }) })] }))] }))] }, file.path));
                        }) }) }), _jsxs("div", { className: "ds-commit-modal-footer", children: [_jsx("button", { ref: cancelRef, type: "button", className: "ds-commit-modal-cancel", onClick: onCancel, disabled: submitting, children: "Cancel" }), _jsx("div", { style: { flex: 1 } }), _jsx("button", { type: "button", className: "ds-commit-modal-btn ds-commit-modal-btn-primary", onClick: handleSubmit, disabled: !allResolved || submitting, title: !allResolved ? 'Pick a resolution for each file' : undefined, children: submitting ? 'Committing…' : 'Commit resolved' })] })] }) }));
}
//# sourceMappingURL=CommitConflictModal.js.map