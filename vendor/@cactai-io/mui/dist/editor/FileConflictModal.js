'use client';
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/editor/FileConflictModal.tsx
//
// Task 11 of the v1.2 commit-flow rebuild — file-conflict modal shown
// when the editor opens a file and discovers different unsaved
// versions on this device vs. another session.
//
// Two-column layout per the Decisions spec:
//
//   Left  — "On this device" (localStorage). Last-edited timestamp,
//           preview of the first 20 lines, "View full diff" link,
//           "Copy to clipboard" button.
//   Right — "From another session or device" (Supabase). Same.
//
// Resolution buttons at the bottom:
//
//   "Keep this device's version" — localStorage wins; Supabase row is
//     overwritten with localStorage content.
//   "Keep the other version" — Supabase wins; localStorage is
//     overwritten with the Supabase content.
//   "Keep both" — the non-primary version is saved under
//     <original-path>.conflict-<ISO-timestamp>.<ext> as a new
//     pending_files entry with operation 'create'. The primary version
//     stays at the original path. The modal asks which side is primary
//     before completing.
//   "Cancel" — closes; both versions remain intact. The editor does
//     not open the file. Developer can revisit.
//
// Affordances:
//   "View full diff" opens DiffViewer in an inline expanded block
//     within the modal (we don't pop a second modal; the diff sits
//     above the resolution buttons until dismissed).
//   "Copy to clipboard" copies the side's content to the clipboard
//     and surfaces a "Copied" toast on the relevant button.
//
// The modal lives inside MonacoFileEditor but is also exported so
// other call sites (e.g. a future "Open in editor" affordance from
// the pending-edits modal) can reuse it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DiffViewer } from '../diff/DiffViewer.js';
const PREVIEW_LINES = 20;
export function FileConflictModal({ path, pendingFilesManager, fetchFn, onResolved, onCancel, }) {
    const fetcher = fetchFn ?? ((...args) => fetch(...args));
    // Load both sides on mount. Local is synchronous; remote is
    // network-bound. We show a small "Loading…" skeleton until remote
    // resolves.
    const [local, setLocal] = useState(null);
    const [remote, setRemote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // UI state
    const [showFullDiff, setShowFullDiff] = useState(false);
    const [copiedSide, setCopiedSide] = useState(null);
    const [keepBothFor, setKeepBothFor] = useState(null);
    const [resolving, setResolving] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        const localRow = pendingFilesManager.getPendingFile(path);
        if (localRow && localRow.current_content != null) {
            setLocal({
                label: 'On this device',
                content: localRow.current_content,
                last_edited_at: localRow.last_edited_at,
            });
        }
        else {
            setLocal(null);
        }
        void (async () => {
            try {
                const res = await fetcher('/api/pending/files', { credentials: 'same-origin' });
                if (cancelled)
                    return;
                if (!res.ok) {
                    setError(`Could not fetch the other version (HTTP ${res.status}).`);
                    setLoading(false);
                    return;
                }
                const data = (await res.json());
                const row = data.files.find(f => f.path === path);
                if (row && row.current_content != null) {
                    setRemote({
                        label: 'From another session or device',
                        content: row.current_content,
                        last_edited_at: row.last_edited_at,
                    });
                }
                else {
                    setRemote(null);
                }
            }
            catch (err) {
                if (!cancelled)
                    setError(`Could not fetch the other version — ${err.message}.`);
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [path, fetcher, pendingFilesManager]);
    // Lifecycle: escape cancels.
    const cancelRef = useRef(null);
    useEffect(() => {
        cancelRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape')
            onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel]);
    // Detect the "identical content, different metadata" edge case the
    // Decisions block calls out. If both sides exist with the same
    // content, there's no conflict — the modal can auto-resolve and
    // close. The caller should rarely hit this in practice because the
    // editor's open flow checks for content equality before mounting
    // the modal, but the defensive case is cheap.
    useEffect(() => {
        if (loading)
            return;
        if (local && remote && local.content === remote.content) {
            onResolved();
        }
    }, [loading, local, remote, onResolved]);
    // ── Resolution actions ─────────────────────────────────────────────────
    const ext = useMemo(() => {
        const i = path.lastIndexOf('.');
        return i > 0 ? path.slice(i + 1) : '';
    }, [path]);
    const handleKeepLocal = useCallback(async () => {
        if (!local)
            return;
        setResolving(true);
        try {
            // Force the local content as the canonical row and flush
            // immediately so Supabase reflects this device's choice before
            // any other tab reads.
            pendingFilesManager.setPendingFile(path, local.content, {
                operation: 'edit',
                immediate: true,
            });
            onResolved();
        }
        finally {
            setResolving(false);
        }
    }, [local, pendingFilesManager, path, onResolved]);
    const handleKeepRemote = useCallback(async () => {
        if (!remote)
            return;
        setResolving(true);
        try {
            pendingFilesManager.setPendingFile(path, remote.content, {
                operation: 'edit',
                immediate: true,
            });
            onResolved();
        }
        finally {
            setResolving(false);
        }
    }, [remote, pendingFilesManager, path, onResolved]);
    const handleKeepBoth = useCallback(async (primary) => {
        if (!local || !remote)
            return;
        setResolving(true);
        try {
            const primarySide = primary === 'local' ? local : remote;
            const sidelineSide = primary === 'local' ? remote : local;
            const ts = new Date().toISOString().replace(/[:]/g, '-');
            const conflictPath = ext
                ? `${path}.conflict-${ts}.${ext}`
                : `${path}.conflict-${ts}`;
            // 1. Stage primary at the original path (overwrite both sides).
            pendingFilesManager.setPendingFile(path, primarySide.content, {
                operation: 'edit',
                immediate: true,
            });
            // 2. Stage the sideline at the conflict path as a new 'create'.
            pendingFilesManager.setPendingFile(conflictPath, sidelineSide.content, {
                operation: 'create',
                original_content: null,
                immediate: true,
            });
            onResolved();
        }
        finally {
            setResolving(false);
        }
    }, [local, remote, pendingFilesManager, path, ext, onResolved]);
    const copyToClipboard = useCallback(async (side) => {
        const s = side === 'local' ? local : remote;
        if (!s)
            return;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(s.content);
                setCopiedSide(side);
                setTimeout(() => setCopiedSide(c => (c === side ? null : c)), 1500);
            }
        }
        catch {
            // Clipboard write failed — silently swallow; the developer can
            // still pick a resolution.
        }
    }, [local, remote]);
    // ── Render ─────────────────────────────────────────────────────────────
    function renderPreview(content) {
        const lines = content.split('\n').slice(0, PREVIEW_LINES);
        return lines.join('\n');
    }
    return (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: (e) => { if (e.target === e.currentTarget && !resolving)
            onCancel(); }, children: _jsxs("div", { className: "ds-commit-modal-card ds-file-conflict-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "ds-file-conflict-title", children: [_jsx("div", { className: "ds-commit-modal-header", children: _jsxs("div", { className: "ds-commit-modal-titles", children: [_jsxs("div", { id: "ds-file-conflict-title", className: "ds-commit-modal-title", children: ["File conflict \u2014 ", path] }), _jsx("div", { className: "ds-commit-modal-subtitle", children: "This file has different unsaved versions on this device and elsewhere. Decide how to proceed." })] }) }), error && _jsx("div", { className: "ds-commit-modal-error", role: "alert", children: error }), loading ? (_jsx("div", { className: "ds-commit-modal-empty", children: "Loading the other version\u2026" })) : !local && !remote ? (_jsx("div", { className: "ds-commit-modal-empty", children: "Neither version has content \u2014 nothing to resolve. Cancel to dismiss." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ds-file-conflict-cols", children: [local ? (_jsx(ConflictColumn, { side: "local", data: local, previewText: renderPreview(local.content), copied: copiedSide === 'local', onCopy: () => copyToClipboard('local'), onViewFullDiff: () => setShowFullDiff(true) })) : (_jsx("div", { className: "ds-file-conflict-col ds-file-conflict-col--missing", children: "No version on this device." })), remote ? (_jsx(ConflictColumn, { side: "remote", data: remote, previewText: renderPreview(remote.content), copied: copiedSide === 'remote', onCopy: () => copyToClipboard('remote'), onViewFullDiff: () => setShowFullDiff(true) })) : (_jsx("div", { className: "ds-file-conflict-col ds-file-conflict-col--missing", children: "No version from another session." }))] }), showFullDiff && local && remote && (_jsxs("div", { className: "ds-file-conflict-full-diff", children: [_jsxs("div", { className: "ds-file-conflict-full-diff-header", children: [_jsx("span", { children: "Full diff (left \u2190 right)" }), _jsx("button", { type: "button", onClick: () => setShowFullDiff(false), children: "Close diff" })] }), _jsx(DiffViewer, { path: path, operation: "edit", original: local.content, current: remote.content })] }))] })), _jsx("div", { className: "ds-commit-modal-footer ds-file-conflict-footer", children: keepBothFor === null ? (_jsxs(_Fragment, { children: [_jsx("button", { ref: cancelRef, type: "button", className: "ds-commit-modal-cancel", onClick: onCancel, disabled: resolving, children: "Cancel" }), _jsx("div", { style: { flex: 1 } }), local && (_jsx("button", { type: "button", className: "ds-commit-modal-btn", onClick: handleKeepLocal, disabled: resolving, children: "Keep this device's version" })), remote && (_jsx("button", { type: "button", className: "ds-commit-modal-btn", onClick: handleKeepRemote, disabled: resolving, children: "Keep the other version" })), local && remote && (_jsx("button", { type: "button", className: "ds-commit-modal-link", onClick: () => setKeepBothFor('local'), disabled: resolving, children: "Keep both" }))] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "ds-file-conflict-prompt", children: "Which version stays at the original path?" }), _jsx("button", { type: "button", className: "ds-commit-modal-btn", onClick: () => handleKeepBoth('local'), disabled: resolving, children: "This device's version" }), _jsx("button", { type: "button", className: "ds-commit-modal-btn", onClick: () => handleKeepBoth('remote'), disabled: resolving, children: "The other version" }), _jsx("button", { type: "button", className: "ds-commit-modal-cancel", onClick: () => setKeepBothFor(null), disabled: resolving, children: "Back" })] })) })] }) }));
}
function ConflictColumn({ side, data, previewText, copied, onCopy, onViewFullDiff }) {
    return (_jsxs("div", { className: `ds-file-conflict-col ds-file-conflict-col--${side}`, children: [_jsxs("div", { className: "ds-file-conflict-col-header", children: [_jsx("span", { className: "ds-file-conflict-col-label", children: data.label }), _jsx("span", { className: "ds-file-conflict-col-time", title: new Date(data.last_edited_at).toLocaleString(), children: formatRelativeTime(data.last_edited_at) })] }), _jsx("pre", { className: "ds-file-conflict-col-preview", children: previewText }), _jsxs("div", { className: "ds-file-conflict-col-actions", children: [_jsx("button", { type: "button", className: "ds-commit-modal-link", onClick: onViewFullDiff, children: "View full diff" }), _jsx("button", { type: "button", className: "ds-commit-modal-link", onClick: onCopy, children: copied ? 'Copied' : 'Copy to clipboard' })] })] }));
}
function formatRelativeTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    const diff = Date.now() - d.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)
        return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h ago`;
    return d.toLocaleString();
}
//# sourceMappingURL=FileConflictModal.js.map