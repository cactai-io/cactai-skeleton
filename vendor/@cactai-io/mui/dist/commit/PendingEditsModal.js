'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/commit/PendingEditsModal.tsx
//
// Task 7 of the v1.2 commit-flow rebuild — full rebuild of the pending-
// edits modal per the Decisions spec.
//
// UI shape:
//   Header
//     - "Pending edits" title
//     - "<N> file(s) with local changes" subtitle
//     - Right side: single "Commit selected to dev" / "Commit all to dev"
//       action button. Disabled when no files are selected or while a
//       commit is in flight.
//   Optional error banner directly below the header (inline alert).
//   Body
//     - Row list, sorted by last_edited_at descending.
//     - Each row:
//        ▸ Checkbox (default checked).
//        ▸ File path. For rename/move, "<old> → <new>" inline.
//        ▸ Operation badge (edit / create / delete / renamed / moved).
//        ▸ Diff summary `+N / -M` for edit/create/delete. For rename/
//          move the path-change replaces the diff summary.
//        ▸ Expand chevron for inline diff (edit/create/delete only).
//        ▸ Per-row discard button.
//   Footer
//     - "Cancel" button
//     - "View commit history" link (opens the CommitHistoryModal)
//     - "Discard all" button (confirms before firing)
//     - "N of M selected" counter
//
// Behavior:
//   - Selection state is local; defaults to "all" unless initialSelection
//     is provided (per-file entry path: a single path pre-selected).
//   - The action button toggles between "Commit selected to dev" and
//     "Commit all to dev" based on whether every file is checked.
//   - Per-row expand chevron toggles an inline DiffViewer block.
//   - Per-row discard is immediate (no confirmation per spec).
//   - "Discard all" pops a confirmation: "Discard all N pending edits?
//     This cannot be undone."
//   - Escape closes (calls onCancel). Backdrop click closes too unless
//     a commit is in flight.
//
// Wire-up notes:
//   - This component is pure — it does not call PendingFilesManager or
//     fetch routes itself. The parent (DevShell) supplies the data and
//     the action callbacks. That keeps the modal testable without a
//     manager singleton and lets DevShell own the post-commit flow
//     (clearing the dirty set, refreshing the tree, etc).
//   - DiffViewer is loaded lazily so a non-expanded modal doesn't pay
//     the cost. Task 12 wires the actual viewer; until then the inline
//     diff falls back to a plain pre-formatted text block computed from
//     the row's content snapshots.
import { useEffect, useMemo, useRef, useState } from 'react';
import { DiffViewer } from '../diff/DiffViewer.js';
// Operation badge label and tone, kept here so the modal and any future
// surface (e.g. the file tree's tooltip) can agree on the wording.
function badgeText(op) {
    switch (op) {
        case 'edit': return 'edit';
        case 'create': return 'create';
        case 'delete': return 'delete';
        case 'rename': return 'renamed';
        case 'move': return 'moved';
    }
}
function isPathChangeOp(op) {
    return op === 'rename' || op === 'move';
}
function isExpandableOp(op) {
    // Edit/create/delete have content to diff. Rename/move are pure path
    // changes — no diff to show, just the inline arrow in the row.
    return op === 'edit' || op === 'create' || op === 'delete';
}
export function PendingEditsModal({ files, initialSelection, committing = false, error, onCommitToDev, onDiscardOne, onDiscardAll, onOpenHistory, onCancel, onOpenGuide, guideSlot, }) {
    // Defensive sort — last_edited_at descending per spec, regardless of
    // the order the parent passed in.
    const sortedFiles = useMemo(() => {
        return [...files].sort((a, b) => (b.lastEditedAt ?? '').localeCompare(a.lastEditedAt ?? ''));
    }, [files]);
    // Selection — default "all checked", or a single path if the parent
    // opened the modal via a per-row entry point.
    const initial = useMemo(() => {
        if (initialSelection && initialSelection.length > 0) {
            return new Set(initialSelection.filter(p => sortedFiles.some(f => f.path === p)));
        }
        return new Set(sortedFiles.map(f => f.path));
    }, [sortedFiles, initialSelection]);
    const [selected, setSelected] = useState(initial);
    // Drop paths that disappeared from the file set (e.g. discarded
    // mid-modal-open).
    useEffect(() => {
        setSelected(prev => {
            const next = new Set();
            for (const p of prev)
                if (sortedFiles.some(f => f.path === p))
                    next.add(p);
            return next;
        });
    }, [sortedFiles]);
    // Per-row expand state for the inline diff.
    const [expanded, setExpanded] = useState(new Set());
    // "Discard all" confirmation — purely modal-local.
    const [confirmingDiscardAll, setConfirmingDiscardAll] = useState(false);
    function toggle(path) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(path))
                next.delete(path);
            else
                next.add(path);
            return next;
        });
    }
    function toggleExpand(path) {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(path))
                next.delete(path);
            else
                next.add(path);
            return next;
        });
    }
    // Modal lifecycle: escape closes; focus the action button.
    const actionRef = useRef(null);
    useEffect(() => {
        actionRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape' && !committing)
            onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel, committing]);
    const selectedCount = selected.size;
    const totalCount = sortedFiles.length;
    const allSelected = selectedCount === totalCount && totalCount > 0;
    const noneSelected = selectedCount === 0;
    function actionLabel() {
        if (committing)
            return 'Committing…';
        return allSelected ? 'Commit all to dev' : 'Commit selected to dev';
    }
    const disabled = committing || noneSelected;
    const tooltip = noneSelected ? 'No local changes to commit' : undefined;
    function handleCommitDev() {
        if (disabled)
            return;
        onCommitToDev(Array.from(selected));
    }
    function handleDiscardAllClick() {
        if (committing)
            return;
        setConfirmingDiscardAll(true);
    }
    function handleConfirmDiscardAll() {
        setConfirmingDiscardAll(false);
        onDiscardAll();
    }
    return (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: e => { if (e.target === e.currentTarget && !committing)
            onCancel(); }, children: _jsxs("div", { className: "ds-commit-modal-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "ds-pending-edits-title", children: [_jsxs("div", { className: "ds-commit-modal-header", children: [_jsxs("div", { className: "ds-commit-modal-titles", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { id: "ds-pending-edits-title", className: "ds-commit-modal-title", children: "Pending edits" }), onOpenGuide && (_jsx("button", { type: "button", onClick: onOpenGuide, "aria-label": "Open pending edits guide", title: "What is this?", style: {
                                                background: 'transparent',
                                                border: '1px solid var(--c-border)',
                                                borderRadius: 10,
                                                color: 'var(--c-text-2)',
                                                cursor: 'pointer',
                                                width: 18, height: 18,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, fontWeight: 600, fontStyle: 'italic', fontFamily: 'serif',
                                                padding: 0, flexShrink: 0,
                                            }, children: "i" }))] }), _jsx("div", { className: "ds-commit-modal-subtitle", children: totalCount === 0
                                        ? 'No files with local changes'
                                        : `${totalCount} file${totalCount === 1 ? '' : 's'} with local changes` })] }), _jsx("div", { className: "ds-commit-modal-actions", children: _jsx("button", { ref: actionRef, type: "button", className: "ds-commit-modal-btn", onClick: handleCommitDev, disabled: disabled, title: tooltip, children: actionLabel() }) })] }), error && _jsx("div", { className: "ds-commit-modal-error", role: "alert", children: error }), _jsxs("div", { style: { position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }, children: [_jsx("div", { className: "ds-commit-modal-body", children: totalCount === 0 ? (_jsx("div", { className: "ds-commit-modal-empty", children: "Nothing to commit. Make an edit to see it listed here." })) : (_jsx("ul", { className: "ds-commit-file-list", children: sortedFiles.map(file => {
                                    const isExpanded = expanded.has(file.path);
                                    const showExpander = isExpandableOp(file.operation);
                                    return (_jsxs("li", { className: "ds-commit-file-li", children: [_jsxs("div", { className: "ds-commit-file-row", "data-op": file.operation, style: {
                                                    opacity: committing ? 0.7 : 1,
                                                    pointerEvents: committing ? 'none' : undefined,
                                                }, children: [_jsx("input", { type: "checkbox", className: "ds-commit-file-checkbox", checked: selected.has(file.path), disabled: committing, onChange: () => toggle(file.path), "aria-label": `Include ${file.path}` }), _jsx("button", { type: "button", className: "ds-commit-file-expand", "aria-label": isExpanded ? 'Collapse diff' : 'Expand diff', "aria-expanded": isExpanded, onClick: () => toggleExpand(file.path), disabled: !showExpander || committing, style: { visibility: showExpander ? 'visible' : 'hidden' }, children: isExpanded ? '▾' : '▸' }), _jsx("span", { className: "ds-commit-file-path", children: isPathChangeOp(file.operation) && file.newPath
                                                            ? _jsxs(_Fragment, { children: [_jsx("span", { className: "ds-commit-file-path-old", children: file.path }), ' → ', _jsx("span", { className: "ds-commit-file-path-new", children: file.newPath })] })
                                                            : file.path }), _jsx("span", { className: `ds-commit-op-badge ds-commit-op-badge--${file.operation}`, children: badgeText(file.operation) }), _jsx("span", { className: "ds-commit-file-diff", children: isPathChangeOp(file.operation) ? (_jsx("span", { className: "ds-commit-file-diff-pathmove", children: "path change" })) : (_jsxs(_Fragment, { children: [_jsxs("span", { className: "ds-commit-file-diff-add", children: ["+", file.linesAdded] }), ' / ', _jsxs("span", { className: "ds-commit-file-diff-remove", children: ["-", file.linesRemoved] })] })) }), _jsx("button", { type: "button", className: "ds-commit-file-discard", onClick: () => onDiscardOne(file.path), disabled: committing, title: "Discard this change", "aria-label": `Discard ${file.path}`, children: "\u2715" })] }), isExpanded && showExpander && (_jsx("div", { className: "ds-commit-file-inline-diff", children: _jsx(DiffViewer, { path: file.path, operation: file.operation, original: file.original_content ?? null, current: file.current_content ?? null }) }))] }, file.path));
                                }) })) }), guideSlot] }), _jsxs("div", { className: "ds-commit-modal-footer", children: [_jsx("button", { type: "button", className: "ds-commit-modal-cancel", onClick: onCancel, disabled: committing, children: "Cancel" }), _jsx("button", { type: "button", className: "ds-commit-modal-link", onClick: onOpenHistory, disabled: committing, children: "View commit history" }), totalCount > 0 && (_jsx("button", { type: "button", className: "ds-commit-modal-discard-all", onClick: handleDiscardAllClick, disabled: committing, children: "Discard all" })), _jsxs("div", { className: "ds-commit-modal-count", children: [selectedCount, " of ", totalCount, " selected"] })] }), confirmingDiscardAll && (_jsx("div", { className: "ds-commit-modal-confirm-overlay", role: "alertdialog", "aria-modal": "true", children: _jsxs("div", { className: "ds-commit-modal-confirm-card", children: [_jsxs("div", { className: "ds-commit-modal-confirm-text", children: ["Discard all ", totalCount, " pending edit", totalCount === 1 ? '' : 's', "? This cannot be undone."] }), _jsxs("div", { className: "ds-commit-modal-confirm-actions", children: [_jsx("button", { type: "button", className: "ds-commit-modal-cancel", onClick: () => setConfirmingDiscardAll(false), children: "Cancel" }), _jsx("button", { type: "button", className: "ds-commit-modal-discard-all", onClick: handleConfirmDiscardAll, autoFocus: true, children: "Discard all" })] })] }) }))] }) }));
}
//# sourceMappingURL=PendingEditsModal.js.map