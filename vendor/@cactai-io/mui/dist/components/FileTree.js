'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/components/FileTree.tsx
//
// Project file tree with two modes:
//   Tree mode: expandable directory listing; v1.2 pending-overlay visuals
//              (new / modified / deleted / renamed / moved), per-row live-
//              preview indicator, right-click context menu with Restore +
//              Commit affordances, SDK protected folder.
//   File view mode: syntax-highlighted code display with breadcrumb
//                   navigation.
//
// Clicking a file in tree mode → file view mode.
// Breadcrumb segment click → navigate back to that directory level.
// Breadcrumb root (~/repo) → restore tree listing.
//
// v1.2 commit-flow rebuild — overlay visuals per the Decisions block:
//
//   modified  — standard pending dot indicator (existing pattern).
//   new       — green plus icon next to the filename + "new" badge.
//   deleted   — 50% opacity + strikethrough on the filename. Hover
//               tooltip: "Will be removed on commit. Right-click to
//               restore." Right-click → context menu "Restore".
//   renamed   — old path shown grayed with "→ <new path>" indicator;
//               new path shown with a "renamed" badge. Right-click on
//               the old slot → "Restore". The merge route in
//               /api/tree-with-pending introduces both slots so the
//               tree can render the pair without additional client
//               logic.
//   moved     — same as renamed; only the badge text differs.
//
// Live-preview indicator — per row, immediately right of the operation
// badges:
//   green dot  — change previews live in the role-view without a Vercel
//                deploy (config-token edits, skeleton.config.json patches).
//   amber dot  — change requires a Vercel rebuild before it shows up in
//                the role-view. Tooltip: "Code changes preview after
//                Vercel deploys."
//
// The classifier mirrors `previewBehaviorFor` in commit/types.ts. We
// import that helper directly so the file tree and the role-view banner
// can never disagree about which paths preview live.
import { useState, useCallback, useEffect, useRef } from 'react';
import { previewBehaviorFor } from '../commit/types.js';
// ── Helpers ─────────────────────────────────────────────────────────────────
// Resolve effective status for a node, accommodating callers that still
// pass `modified` on the bare tree (back-compat).
function effectiveStatus(node, uncommittedPaths) {
    if (node.type === 'folder')
        return 'clean';
    if (node.status)
        return node.status;
    // Legacy: derive 'modified' from the uncommittedPaths set or the node's flag.
    if (uncommittedPaths?.has(node.path) || node.modified)
        return 'modified';
    return 'clean';
}
// Tooltip text for hover on a pending row. Per the Decisions block.
function tooltipForStatus(status, newPath) {
    switch (status) {
        case 'deleted': return 'Will be removed on commit. Right-click to restore.';
        case 'renamed': return newPath
            ? `Will be renamed to ${newPath} on commit. Right-click to restore.`
            : 'Will be renamed on commit. Right-click to restore.';
        case 'moved': return newPath
            ? `Will be moved to ${newPath} on commit. Right-click to restore.`
            : 'Will be moved on commit. Right-click to restore.';
        case 'new': return 'New file — will be created on commit.';
        case 'modified': return 'Has uncommitted edits.';
        default: return undefined;
    }
}
// Minimal syntax highlighting — tokenises by regex, returns colored spans.
// Not a full syntax highlighter — just enough to be readable in the
// file-view mode. Monaco (Task 11) replaces this for actual editing.
function highlight(code, ext) {
    if (!['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'sql'].includes(ext)) {
        return [_jsx("span", { children: code }, "0")];
    }
    return code.split('\n').map((line, i) => (_jsxs("span", { style: { display: 'block' }, children: [_jsx(HighlightLine, { line: line, ext: ext }), '\n'] }, i)));
}
function HighlightLine({ line, ext: _ext }) {
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith(' *')) {
        return _jsx("span", { style: { color: 'var(--ds-text-3)' }, children: line });
    }
    if (line.startsWith('import ') || line.startsWith('export ')) {
        return _jsx("span", { style: { color: 'var(--ds-purple)' }, children: line });
    }
    if (/^\s*(const|let|var|function|class|interface|type)\b/.test(line)) {
        return _jsx("span", { style: { color: 'var(--ds-pink)' }, children: line });
    }
    return _jsx("span", { style: { color: 'var(--ds-text)' }, children: line });
}
function getExt(path) {
    return path.split('.').pop()?.toLowerCase() ?? '';
}
function pathToBreadcrumbs(path) {
    return ['~', ...path.split('/').filter(Boolean)];
}
// Sort helper applied at every tree level. Order:
//   1) folders         (alphabetical)
//   2) dotfiles        (alphabetical, e.g. .env, .gitignore)
//   3) regular files   (alphabetical, case-insensitive)
// This groups directory navigation at the top and pushes ad-hoc files
// to the bottom — a familiar pattern from VS Code / Finder. Stable
// across renders because the inputs are deterministic.
function sortNodes(nodes) {
    const folders = [];
    const dotfiles = [];
    const files = [];
    for (const n of nodes) {
        if (n.type === 'folder')
            folders.push(n);
        else if (n.name.startsWith('.'))
            dotfiles.push(n);
        else
            files.push(n);
    }
    const alpha = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    folders.sort(alpha);
    dotfiles.sort(alpha);
    files.sort(alpha);
    return [...folders, ...dotfiles, ...files];
}
// ── Tree node ───────────────────────────────────────────────────────────────
function TreeNode({ node, depth, activeFilePath, onSelect, uncommittedPaths, onCommitFile, onRestore, onUndoFile, onContextMenu, }) {
    // Default-collapsed at every depth (was: `depth < 1` which auto-expanded
    // every root-level folder on first paint and made the file tree feel
    // overwhelming). The user opens whichever folders they actually need.
    const [open, setOpen] = useState(false);
    const isActive = node.path === activeFilePath;
    const isFolder = node.type === 'folder';
    const isProtected = !!node.protected;
    const status = effectiveStatus(node, uncommittedPaths);
    const isPending = status !== 'clean';
    const tooltip = tooltipForStatus(status, node.new_path);
    const preview = !isFolder ? previewBehaviorFor(node.path) : null;
    function handleClick() {
        if (isProtected)
            return;
        if (isFolder) {
            setOpen(o => !o);
        }
        else {
            onSelect(node.path);
        }
    }
    function handleCommitClick(e) {
        e.stopPropagation();
        if (onCommitFile && isPending)
            onCommitFile(node.path);
    }
    function handleContextMenu(e) {
        // Show the menu for any pending row (restore / commit) OR any file
        // row (rename / delete via the new CRUD callbacks). Folders only
        // show the menu when there's a CRUD handler — there's nothing else
        // to offer for them today.
        if (!onContextMenu)
            return;
        if (!isPending && isFolder)
            return;
        e.preventDefault();
        onContextMenu(e, node.path, status);
    }
    // CSS state classes — DevShellStyles (or the host app) is responsible
    // for the visual treatment per status (opacity, strikethrough, etc).
    // The component contract: stamp data-status on the row and apply a
    // small set of stable class names. Styling lives downstream.
    const classes = [
        'ds-tree-item',
        isFolder ? '' : 'ds-tree-file',
        isActive ? 'ds-tree-active' : '',
        isProtected ? 'ds-tree-protected' : '',
        isPending ? `ds-tree-pending ds-tree-pending--${status}` : '',
    ].filter(Boolean).join(' ');
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: classes, "data-status": status, title: tooltip, style: { marginLeft: depth * 16 }, onClick: handleClick, onContextMenu: handleContextMenu, role: isFolder ? 'button' : 'option', "aria-selected": isActive, tabIndex: isProtected ? -1 : 0, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ')
                    handleClick(); }, children: [_jsx("span", { className: "ds-tree-chev", children: isFolder ? (open ? '▾' : '▸') : '' }), _jsx("span", { className: "ds-tree-icon", children: isProtected ? '🔒' : isFolder ? '📁' : '⌘' }), _jsxs("span", { className: "ds-tree-name", children: [node.name, (status === 'renamed' || status === 'moved') && node.new_path && (_jsxs("span", { className: "ds-tree-rename-arrow", children: [' → ', node.new_path] }))] }), !isFolder && status === 'new' && (_jsx("span", { className: "ds-tree-status-badge ds-tree-status-badge--new", "aria-label": "new file", children: "new" })), !isFolder && (status === 'renamed' || status === 'moved') && (_jsx("span", { className: `ds-tree-status-badge ds-tree-status-badge--${status}`, "aria-label": status, children: status })), !isFolder && status === 'deleted' && (_jsx("span", { className: "ds-tree-status-badge ds-tree-status-badge--deleted", "aria-label": "will be deleted", children: "delete" })), !isFolder && status === 'modified' && (_jsx("span", { className: "ds-tree-mod-dot", "aria-label": "modified" })), !isFolder && isPending && preview && (_jsx("span", { className: `ds-tree-preview-dot ds-tree-preview-dot--${preview === 'live' ? 'live' : 'needs-deploy'}`, title: preview === 'live'
                            ? 'Previews live in the role-view.'
                            : 'Code changes preview after Vercel deploys.', "aria-label": preview === 'live' ? 'previews live' : 'needs deploy' })), isProtected && _jsx("span", { className: "ds-tree-sdk-badge", children: "SDK" }), isPending && !isFolder && onCommitFile && (_jsx("button", { type: "button", className: "ds-tree-commit-btn", onClick: handleCommitClick, title: `Commit ${node.name}`, "aria-label": `Commit ${node.name}`, children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "4" }), _jsx("path", { d: "M1.05 12H7M16.95 12H23" })] }) })), isPending && !isFolder && onUndoFile && (_jsx("button", { type: "button", className: "ds-tree-restore-btn", onClick: (e) => { e.stopPropagation(); onUndoFile(node.path); }, title: `Undo changes to ${node.name}`, "aria-label": `Undo changes to ${node.name}`, children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 7v6h6" }), _jsx("path", { d: "M3 13a9 9 0 1 0 3-7.7L3 8" })] }) }))] }), isFolder && open && !isProtected && sortNodes(node.children ?? []).map(child => (_jsx(TreeNode, { node: child, depth: depth + 1, activeFilePath: activeFilePath, onSelect: onSelect, uncommittedPaths: uncommittedPaths, onCommitFile: onCommitFile, onRestore: onRestore, onUndoFile: onUndoFile, onContextMenu: onContextMenu }, child.path)))] }));
}
// ── Root component ──────────────────────────────────────────────────────────
// Split-vs-full file-view threshold. When the panel is wider than this
// (in px), opening a file renders tree + file SIDE BY SIDE; below the
// threshold the file replaces the tree (full-window). Derivation:
//   ≥ 200 px for a usable tree column
//   + 60 ch × ~7 px (12 px monospace) ≈ 420 px for a readable code column
//   + ~80 px breathing room (separator, gutters)
// Total ≈ 700 px. Per user direction (2026-05-30): "based on reasonable
// minimum viewing requirement for content width relative to font size."
const SPLIT_VIEW_MIN_WIDTH_PX = 700;
const TREE_COLUMN_WIDTH_PX = 240;
export function FileTree({ nodes, activeFilePath, onFileSelect, fileContent, fileLoading = false, onExitFileView, onCollapse, uncommittedPaths, onCommitFile, onRestore, onUndoFile, onCreateFile, onRenameFile, onDeleteFile, }) {
    const isFileView = !!activeFilePath && fileContent !== undefined;
    const breadcrumbs = activeFilePath ? pathToBreadcrumbs(activeFilePath) : [];
    const ext = activeFilePath ? getExt(activeFilePath) : '';
    // CRUD prompts. Native window.prompt keeps the surface minimal until a
    // proper modal UI lands; the data path is the same.
    const handleNewFile = async () => {
        if (!onCreateFile)
            return;
        const path = window.prompt('New file path (e.g. src/components/Foo.tsx):');
        if (!path || !path.trim())
            return;
        await onCreateFile(path.trim(), '');
    };
    const handleRename = async (oldPath) => {
        if (!onRenameFile)
            return;
        const newPath = window.prompt(`Rename ${oldPath} to:`, oldPath);
        if (!newPath || newPath.trim() === oldPath)
            return;
        await onRenameFile(oldPath, newPath.trim());
    };
    const handleDelete = async (path) => {
        if (!onDeleteFile)
            return;
        if (!window.confirm(`Stage ${path} for deletion? Will apply on next commit; discard the pending row to undo.`))
            return;
        await onDeleteFile(path);
    };
    // Measure the panel width via ResizeObserver so the split-vs-full
    // decision rebalances when the developer drags the Files panel taller
    // or the chat drawer wider. Initial value matches the threshold so
    // SSR/hydration mismatches don't briefly flash the wrong layout.
    const rootRef = useRef(null);
    const [panelWidth, setPanelWidth] = useState(SPLIT_VIEW_MIN_WIDTH_PX);
    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof ResizeObserver === 'undefined')
            return;
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry)
                setPanelWidth(entry.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const useSplitView = isFileView && panelWidth >= SPLIT_VIEW_MIN_WIDTH_PX;
    // Right-click context menu state. Tracks the cursor coordinates plus
    // the path and the status of the row the menu is acting on. Status
    // determines the menu items — Restore is shown for any pending row;
    // Commit is shown when onCommitFile is wired.
    const [contextMenu, setContextMenu] = useState(null);
    const openContextMenu = useCallback((e, path, status) => {
        setContextMenu({ x: e.clientX, y: e.clientY, path, status });
    }, []);
    const closeContextMenu = useCallback(() => setContextMenu(null), []);
    // Close the menu on any outside click, escape, or scroll.
    useEffect(() => {
        if (!contextMenu)
            return;
        const onDocClick = () => closeContextMenu();
        const onKey = (e) => { if (e.key === 'Escape')
            closeContextMenu(); };
        const onScroll = () => closeContextMenu();
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);
        document.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, [contextMenu, closeContextMenu]);
    const handleBreadcrumbClick = useCallback((index) => {
        if (index === 0)
            onExitFileView?.();
        else
            onExitFileView?.();
    }, [onExitFileView]);
    // Context-menu item visibility: Restore is always offered for a pending
    // row (the discard semantics in PendingFilesManager cover every op).
    // Commit is offered when the parent wired it.
    const showRestore = contextMenu && onRestore;
    const showCommit = contextMenu && onCommitFile && contextMenu.status !== 'deleted';
    // Restore-label varies by operation per the spec; the menu reads
    // better when the verb fits the action. For deleted/renamed/moved the
    // word "Restore" is exactly right; for modified/new "Discard change"
    // is more accurate. We keep both phrasings in one menu item to avoid
    // a second item that does effectively the same thing.
    const restoreLabel = (() => {
        if (!contextMenu)
            return 'Restore';
        switch (contextMenu.status) {
            case 'deleted': return 'Restore';
            case 'renamed': return 'Restore (cancel rename)';
            case 'moved': return 'Restore (cancel move)';
            case 'modified': return 'Discard changes';
            case 'new': return 'Discard new file';
            default: return 'Restore';
        }
    })();
    return (_jsxs("div", { className: "ds-tree-panel", ref: rootRef, style: { height: '100%' }, children: [_jsxs("div", { className: "ds-tree-header", children: [isFileView ? (
                    // Breadcrumb navigation in file view mode
                    _jsx("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            fontFamily: 'var(--f-mono)',
                            fontSize: 11.5,
                            color: 'var(--ds-text-2)',
                            flex: 1,
                            overflow: 'hidden',
                        }, children: breadcrumbs.map((segment, i) => (_jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 2 }, children: [i > 0 && _jsx("span", { style: { color: 'var(--ds-text-3)' }, children: "/" }), _jsx("button", { onClick: () => handleBreadcrumbClick(i), style: {
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: i === breadcrumbs.length - 1
                                            ? 'var(--ds-text)'
                                            : 'var(--ds-text-2)',
                                        fontFamily: 'var(--f-ui)',
                                        fontSize: 'inherit',
                                        padding: '0 2px',
                                        fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                                    }, children: segment })] }, i))) })) : (_jsx("span", { className: "ds-tree-title", children: "Project tree" })), _jsx("div", { className: "ds-tree-spacer" }), !isFileView && onCreateFile && (_jsx("button", { onClick: handleNewFile, title: "New file", "aria-label": "New file", style: {
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--ds-text-2)', padding: '0 6px', fontSize: 16, lineHeight: 1,
                        }, children: "+" })), _jsx("button", { className: "ds-tree-collapse-btn", onClick: onCollapse, title: "Collapse", "aria-label": "Collapse project tree", children: "\u2304" })] }), _jsxs("div", { className: "ds-tree-body", role: isFileView ? 'document' : 'tree', style: {
                    padding: isFileView ? 0 : undefined,
                    // Split view: tree column on the left, file content on the right.
                    // Full-window: stacked / single column (default flex behavior).
                    display: useSplitView ? 'flex' : undefined,
                    flexDirection: useSplitView ? 'row' : undefined,
                }, children: [(useSplitView || !isFileView) && (_jsx("div", { style: useSplitView
                            ? {
                                width: TREE_COLUMN_WIDTH_PX,
                                flex: `0 0 ${TREE_COLUMN_WIDTH_PX}px`,
                                overflowY: 'auto',
                                borderRight: '1px solid var(--ds-border-soft)',
                                padding: '8px 4px',
                            }
                            : { width: '100%' }, children: sortNodes(nodes).map(node => (_jsx(TreeNode, { node: node, depth: 0, activeFilePath: activeFilePath, onSelect: onFileSelect, uncommittedPaths: uncommittedPaths, onCommitFile: onCommitFile, onRestore: onRestore, onUndoFile: onUndoFile, onContextMenu: (onRestore || onCommitFile) ? openContextMenu : undefined }, node.path))) })), isFileView && (_jsx("div", { style: {
                            fontFamily: 'var(--f-mono)',
                            fontSize: 12,
                            lineHeight: 1.65,
                            color: 'var(--ds-text)',
                            padding: '12px 0',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            height: '100%',
                            flex: useSplitView ? 1 : undefined,
                            minWidth: 0,
                            width: useSplitView ? undefined : '100%',
                        }, children: fileLoading ? (_jsx("div", { style: { padding: '24px 18px', color: 'var(--ds-text-3)', fontSize: 12 }, children: "Loading\u2026" })) : fileContent ? (_jsxs("table", { style: { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }, children: [_jsxs("colgroup", { children: [_jsx("col", { style: { width: 56 } }), _jsx("col", {})] }), _jsx("tbody", { children: fileContent.split('\n').map((line, i) => (_jsxs("tr", { children: [_jsx("td", { style: {
                                                    padding: '0 12px 0 18px',
                                                    color: 'var(--ds-text-3)',
                                                    textAlign: 'right',
                                                    userSelect: 'none',
                                                    fontSize: 11,
                                                    verticalAlign: 'top',
                                                }, children: i + 1 }), _jsx("td", { style: {
                                                    padding: '0 18px 0 0',
                                                    verticalAlign: 'top',
                                                    whiteSpace: 'pre-wrap',
                                                    overflowWrap: 'anywhere',
                                                    wordBreak: 'break-word',
                                                }, children: _jsx(HighlightLine, { line: line, ext: ext }) })] }, i))) })] })) : (_jsx("div", { style: { padding: '24px 18px', color: 'var(--ds-text-3)', fontSize: 12 }, children: "Empty file" })) }))] }), contextMenu && (_jsxs("div", { className: "ds-tree-context-menu", role: "menu", style: { left: contextMenu.x, top: contextMenu.y }, onClick: e => e.stopPropagation(), children: [showCommit && (_jsx("button", { type: "button", role: "menuitem", className: "ds-tree-context-menu-item", onClick: () => {
                            if (onCommitFile)
                                onCommitFile(contextMenu.path);
                            closeContextMenu();
                        }, children: "Commit this file" })), showRestore && (_jsx("button", { type: "button", role: "menuitem", className: "ds-tree-context-menu-item", onClick: () => {
                            if (onRestore)
                                onRestore(contextMenu.path);
                            closeContextMenu();
                        }, children: restoreLabel })), onRenameFile && (_jsx("button", { type: "button", role: "menuitem", className: "ds-tree-context-menu-item", onClick: () => {
                            void handleRename(contextMenu.path);
                            closeContextMenu();
                        }, children: "Rename\u2026" })), onDeleteFile && contextMenu.status !== 'deleted' && (_jsx("button", { type: "button", role: "menuitem", className: "ds-tree-context-menu-item", onClick: () => {
                            void handleDelete(contextMenu.path);
                            closeContextMenu();
                        }, children: "Delete\u2026" }))] }))] }));
}
// Re-export the highlight helper for any consumer that wants the
// read-only file-view treatment without mounting the full tree.
export { highlight, HighlightLine };
//# sourceMappingURL=FileTree.js.map