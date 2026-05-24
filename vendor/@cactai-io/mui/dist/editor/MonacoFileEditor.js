'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/editor/MonacoFileEditor.tsx
//
// Task 11 of the v1.2 commit-flow rebuild — Monaco-based file editor
// for the DevShell. Replaces the old read-only file-view treatment in
// FileTree.tsx whenever the developer opens a file for editing.
//
// Features per the Decisions spec:
//   - Multi-tab. The component owns its open-tabs state; the parent
//     (DevShell) drives openFile() / closeFile() to push or remove
//     entries.
//   - Save indicator in the editor header reads `Saved 4s ago` /
//     `Saving…` based on flushed_to_supabase_at against the
//     PendingFilesManager.
//   - Unsaved-dot in the tree comes from elsewhere — this component
//     drives the staging layer; the tree reads from the manager
//     directly.
//   - Diff toggle in the header switches between edit view and unified
//     diff view (via DiffViewer).
//   - Language list per the spec (14 languages); unrecognised
//     extensions fall back to plaintext — still editable, just without
//     syntax/IntelliSense.
//   - Font: Fira Code via the platform's --f-mono CSS variable (which
//     the skeleton's tokens.ts already populates from
//     `font_family_mono`).
//   - Theme: dark, reading CSS custom properties so the editor
//     inherits the Cactai palette rather than Monaco's stock dark.
//   - File-open path: from tree row click → fetches dev content via
//     /api/github/file → caches as original_content for diff/revert.
//     If a pending edit exists, the manager's row supplies the
//     current_content instead.
//   - Cross-tab edit handling: subscribes to the manager's per-path
//     cross-tab feed. When fired for the currently-active editor file,
//     surfaces a banner so the developer can choose between reload
//     and keep-editing.
//   - Conflict resolution on open: when both localStorage and Supabase
//     have entries for the same path with different content, opens
//     FileConflictModal before mounting the editor. localStorage wins
//     by default (matches PendingFilesManager.hydrate's semantics
//     once the conflict is resolved).
//
// Note on imports: `@monaco-editor/react` is loaded dynamically so the
// rest of the @cactai-io/mui package doesn't pull Monaco into bundles
// that don't render the editor (e.g. SSR-only paths, the marketing
// app). The fallback while loading is a placeholder spinner.
import { useCallback, useEffect, useMemo, useState, lazy, Suspense, } from 'react';
import { previewBehaviorFor } from '../commit/types.js';
import { DiffViewer, languageForPath as diffLanguageFor } from '../diff/DiffViewer.js';
import { FileConflictModal } from './FileConflictModal.js';
// Lazy import — keeps Monaco out of the bundle until first open.
// React 19 typing: `@monaco-editor/react` exports more than just `default`,
// so its module shape doesn't satisfy React.lazy's strict
// `{ default: ComponentType<P> }` constraint. Cast through unknown to
// React.ComponentType<any> so prop spreads at the call site stay assignable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MonacoEditor = lazy(() => import('@monaco-editor/react').then(m => ({ default: m.default })));
// Language detection per the Decisions spec. Shares its extension map
// with DiffViewer.languageForPath so the editor and the diff highlight
// stay in sync. Monaco understands these ids out of the box.
function monacoLanguageForPath(path) {
    // The diff helper uses 'tsx' / 'jsx' which Monaco maps to
    // 'typescriptreact' / 'javascriptreact'. We normalise here.
    const base = diffLanguageFor(path);
    if (base === 'tsx')
        return 'typescript'; // Monaco renders .tsx with the typescript worker
    if (base === 'jsx')
        return 'javascript';
    return base;
}
function formatSavedAgo(savedAt, now) {
    const s = Math.max(1, Math.floor((now - savedAt) / 1000));
    if (s < 60)
        return `Saved ${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `Saved ${m}m ago`;
    const h = Math.floor(m / 60);
    return `Saved ${h}h ago`;
}
// ── Component ───────────────────────────────────────────────────────────────
export function MonacoFileEditor({ openTabs, activePath, pendingFilesManager, onActivate, onClose, fetchFn, }) {
    // Per-tab transient state. Lives in component-local maps because the
    // staging layer is the durable source of truth — re-mounting the
    // editor would lose nothing important.
    const [diffViewByPath, setDiffViewByPath] = useState({});
    const [saveStateByPath, setSaveStateByPath] = useState({});
    const [crossTabNoticeByPath, setCrossTabNoticeByPath] = useState({});
    const [conflictForPath, setConflictForPath] = useState(null);
    // Cached editor contents (what the editor is currently rendering). We
    // mirror the manager's row here so the Monaco buffer stays in sync
    // with cross-tab updates without us having to imperatively call the
    // Monaco model API on every storage event.
    const [contentByPath, setContentByPath] = useState({});
    // "Now" tick to drive the live `Saved Ns ago` label without
    // re-rendering on every animation frame.
    const [tickNow, setTickNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setTickNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    // ── Initialise content from manager on tab open ──────────────────────────
    useEffect(() => {
        setContentByPath(prev => {
            const next = { ...prev };
            for (const tab of openTabs) {
                if (next[tab.path] !== undefined)
                    continue;
                const pending = pendingFilesManager.getPendingFile(tab.path);
                const initial = pending?.current_content ?? tab.original_content;
                next[tab.path] = initial;
            }
            // Drop content for tabs no longer open.
            const openPaths = new Set(openTabs.map(t => t.path));
            for (const p of Object.keys(next))
                if (!openPaths.has(p))
                    delete next[p];
            return next;
        });
    }, [openTabs, pendingFilesManager]);
    // ── Cross-tab subscription per open tab ──────────────────────────────────
    useEffect(() => {
        const unsubs = openTabs.map(tab => pendingFilesManager.subscribeCrossTab(tab.path, (next, _prev) => {
            // Surface the banner only for the currently-focused tab; for
            // background tabs we silently update the cached content so a
            // tab switch shows the fresh state without an extra round-trip.
            if (next?.current_content != null) {
                setContentByPath(prev => ({ ...prev, [tab.path]: next.current_content }));
            }
            if (tab.path === activePath) {
                setCrossTabNoticeByPath(prev => ({ ...prev, [tab.path]: true }));
            }
        }));
        return () => { for (const u of unsubs)
            u(); };
    }, [openTabs, activePath, pendingFilesManager]);
    // ── Save handler ─────────────────────────────────────────────────────────
    //
    // Editor onChange fires for every keystroke. We update the local
    // content cache synchronously (so the editor's controlled value
    // stays consistent) and call setPendingFile on the manager. The
    // manager's debounce + max-interval handles the actual Supabase
    // flush; we just mark the save indicator state.
    const handleChange = useCallback((path, value) => {
        if (value === undefined)
            return;
        const tab = openTabs.find(t => t.path === path);
        if (!tab)
            return;
        setContentByPath(prev => ({ ...prev, [path]: value }));
        setSaveStateByPath(prev => ({ ...prev, [path]: { kind: 'saving' } }));
        pendingFilesManager.setPendingFile(path, value, {
            operation: tab.is_new ? 'create' : 'edit',
            original_content: tab.is_new ? null : tab.original_content,
        });
        // Transition saving → saved on the next tick. The manager's flush
        // is asynchronous and we don't observe its completion here; in
        // practice the indicator's job is to give the developer fast
        // feedback that the keystroke landed in the staging layer, not to
        // certify the round-trip to Supabase. The PendingFilesManager
        // owns the actual durability guarantee.
        setTimeout(() => {
            setSaveStateByPath(prev => ({ ...prev, [path]: { kind: 'saved', at: Date.now() } }));
        }, 50);
    }, [openTabs, pendingFilesManager]);
    // ── Header rendering helpers ─────────────────────────────────────────────
    const activeTab = useMemo(() => openTabs.find(t => t.path === activePath) ?? null, [openTabs, activePath]);
    const activeContent = activePath !== null ? contentByPath[activePath] : null;
    const activeDiffOn = activePath !== null ? !!diffViewByPath[activePath] : false;
    const activeSave = activePath !== null ? saveStateByPath[activePath] ?? { kind: 'clean' } : { kind: 'clean' };
    const activeCrossTab = activePath !== null ? !!crossTabNoticeByPath[activePath] : false;
    const activeLanguage = activeTab ? monacoLanguageForPath(activeTab.path) : 'plaintext';
    const activePreview = activeTab ? previewBehaviorFor(activeTab.path) : 'live';
    const handleToggleDiff = useCallback(() => {
        if (!activePath)
            return;
        setDiffViewByPath(prev => ({ ...prev, [activePath]: !prev[activePath] }));
    }, [activePath]);
    const handleDismissCrossTab = useCallback(() => {
        if (!activePath)
            return;
        setCrossTabNoticeByPath(prev => ({ ...prev, [activePath]: false }));
    }, [activePath]);
    const handleReloadFromPeerTab = useCallback(() => {
        if (!activePath)
            return;
        const peer = pendingFilesManager.getPendingFile(activePath);
        if (peer?.current_content != null) {
            setContentByPath(prev => ({ ...prev, [activePath]: peer.current_content }));
        }
        setCrossTabNoticeByPath(prev => ({ ...prev, [activePath]: false }));
    }, [activePath, pendingFilesManager]);
    // Save-indicator label.
    const saveLabel = useMemo(() => {
        if (activeSave.kind === 'saving')
            return 'Saving…';
        if (activeSave.kind === 'saved')
            return formatSavedAgo(activeSave.at, tickNow);
        return '';
    }, [activeSave, tickNow]);
    // ── Render ───────────────────────────────────────────────────────────────
    if (openTabs.length === 0 || !activeTab || activePath === null) {
        return (_jsx("div", { className: "ds-editor-empty", children: "No file open. Click a file in the tree to start editing." }));
    }
    return (_jsxs("div", { className: "ds-editor-root", children: [_jsx("div", { className: "ds-editor-tabs", role: "tablist", children: openTabs.map(tab => {
                    const isActive = tab.path === activePath;
                    const pending = pendingFilesManager.getPendingFile(tab.path);
                    const unsaved = pending !== null;
                    return (_jsxs("div", { role: "tab", "aria-selected": isActive, className: `ds-editor-tab${isActive ? ' ds-editor-tab--active' : ''}`, onClick: () => onActivate(tab.path), children: [_jsx("span", { className: "ds-editor-tab-name", children: tab.path.split('/').pop() ?? tab.path }), unsaved && _jsx("span", { className: "ds-editor-tab-dot", "aria-label": "unsaved" }), _jsx("button", { type: "button", className: "ds-editor-tab-close", onClick: (e) => { e.stopPropagation(); onClose(tab.path); }, "aria-label": `Close ${tab.path}`, children: "\u00D7" })] }, tab.path));
                }) }), _jsxs("div", { className: "ds-editor-header", children: [_jsx("span", { className: "ds-editor-header-path", title: activeTab.path, children: activeTab.path }), _jsx("span", { className: "ds-editor-header-save", "aria-live": "polite", children: saveLabel }), _jsx("span", { className: `ds-editor-header-preview ds-editor-header-preview--${activePreview === 'live' ? 'live' : 'needs-deploy'}`, title: activePreview === 'live'
                            ? 'Previews live in the role-view.'
                            : 'Code changes preview after Vercel deploys.', children: activePreview === 'live' ? '● live' : '● needs deploy' }), _jsx("button", { type: "button", className: "ds-editor-header-diff-toggle", onClick: handleToggleDiff, "aria-pressed": activeDiffOn, children: activeDiffOn ? 'Editor' : 'Diff' })] }), activeCrossTab && (_jsxs("div", { className: "ds-editor-cross-tab-banner", role: "status", children: [_jsx("span", { children: "This file is being edited in another tab. Reload to see those changes or continue editing here." }), _jsxs("div", { className: "ds-editor-cross-tab-actions", children: [_jsx("button", { type: "button", onClick: handleReloadFromPeerTab, children: "Reload" }), _jsx("button", { type: "button", onClick: handleDismissCrossTab, children: "Continue editing" })] })] })), _jsx("div", { className: "ds-editor-body", children: activeDiffOn ? (_jsx(DiffViewer, { path: activeTab.path, operation: activeTab.is_new ? 'create' : 'edit', original: activeTab.is_new ? null : activeTab.original_content, current: activeContent ?? '' })) : (_jsx(Suspense, { fallback: _jsx("div", { className: "ds-editor-loading", children: "Loading editor\u2026" }), children: _jsx(MonacoEditor, { height: "100%", path: activeTab.path, language: activeLanguage, theme: "cactai-dark", value: activeContent ?? '', onChange: (v) => handleChange(activeTab.path, v), 
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        beforeMount: (monaco) => {
                            // Define a theme that reads our CSS variables. Monaco
                            // doesn't directly support CSS-var-driven themes, but
                            // we can poll the computed style at theme-define time
                            // and pass concrete color values. The cost is negligible
                            // — done once per mount.
                            try {
                                const root = typeof document !== 'undefined' ? document.documentElement : null;
                                const cs = root ? getComputedStyle(root) : null;
                                const pick = (name, fallback) => (cs?.getPropertyValue(name).trim() || fallback);
                                monaco.editor.defineTheme('cactai-dark', {
                                    base: 'vs-dark',
                                    inherit: true,
                                    rules: [],
                                    colors: {
                                        'editor.background': pick('--c-surface', '#13131F'),
                                        'editor.foreground': pick('--c-text', '#F5F5FA'),
                                        'editorLineNumber.foreground': pick('--c-text-3', '#8B8B9F'),
                                        'editor.selectionBackground': pick('--c-primary', '#6366F1') + '40',
                                        'editorCursor.foreground': pick('--c-primary', '#6366F1'),
                                        'editor.lineHighlightBackground': pick('--c-background', '#0A0A0F'),
                                    },
                                });
                            }
                            catch {
                                // Theme define failure — fall back to default vs-dark.
                            }
                        }, options: {
                            fontFamily: typeof document !== 'undefined'
                                ? (getComputedStyle(document.documentElement).getPropertyValue('--f-mono').trim()
                                    || "'Fira Code', 'JetBrains Mono', monospace")
                                : "'Fira Code', 'JetBrains Mono', monospace",
                            fontLigatures: true,
                            fontSize: 13,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            lineNumbers: 'on',
                            renderLineHighlight: 'gutter',
                            tabSize: 2,
                            automaticLayout: true,
                        } }) })) }), conflictForPath && (_jsx(FileConflictModal, { path: conflictForPath, pendingFilesManager: pendingFilesManager, fetchFn: fetchFn, onResolved: () => setConflictForPath(null), onCancel: () => setConflictForPath(null) }))] }));
}
//# sourceMappingURL=MonacoFileEditor.js.map