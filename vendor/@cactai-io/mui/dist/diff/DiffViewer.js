'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/diff/DiffViewer.tsx
//
// Thread 10 of v1.2 — unified + side-by-side diff renderer used in three
// sites:
//
//   - PendingEditsModal row expansion
//   - CommitHistoryModal row expansion
//   - MonacoFileEditor header toggle (edit-view ↔ diff-view)
//
// Library choice:
//
//   - `diff` (jsdiff) for line-level diff computation.
//   - `react-diff-viewer-continued` for rendering.
//
// Why those:
//
//   - `diff` is the de-facto JS line-diff package; its `diffLines` output
//     is the input shape `react-diff-viewer-continued` expects. The
//     PendingFilesManager already uses an inline LCS for line counts;
//     this file consolidates against `diff.diffLines` so the staging
//     layer's counts and the viewer's render agree about every change.
//   - `react-diff-viewer-continued` is the maintained fork of the old
//     `react-diff-viewer` (last published 2021). It supports unified +
//     split views, syntax highlighting via prism, custom themes via
//     CSS variables, line numbers, and lazy rendering of long diffs.
//     Bundle cost is ~40KB gzipped — within the v1.2 budget the
//     Decisions block accepted for Monaco alongside.
//
// Both packages are already declared in packages/mui/package.json. The
// imports below load the react renderer dynamically the first time a
// diff actually needs to render, so a DevShell mount that never opens
// a diff doesn't pay the bundle cost. The fallback inline renderer
// covers SSR and test paths that opt into `fallbackOnly`.
//
// Theme: this component sets `styles` on the rendered viewer so it reads
// the same CSS variables as the inline fallback (--c-diff-add-bg,
// --c-diff-remove-bg, etc.) and inherits the platform palette. The
// Cactai dark theme drops in without per-component tweaks.
//
// Truncation: long diffs collapse to TRUNCATE_LINES; users can click
// "Show all" to expand. For the third-party viewer we pre-truncate the
// content snapshots before handing them in, so the viewer itself
// doesn't have to know about our policy.
//
// Caching: in-memory per (path + content hash) so re-opening the same
// row's expansion doesn't recompute. The cache is process-local and
// modal-lifetime; closing the modal clears it. The cache lives at
// module scope so multiple integration sites share it within the same
// session (helpful when the same file is viewed in both the pending
// modal and the editor's diff toggle on the same load).
//
// Failure model: if computing the diff throws (extreme edge case —
// e.g. a content snapshot that isn't a string), the viewer renders an
// inline error rather than crashing the modal. Suspense covers the
// async chunk load; if it errors at runtime the inline fallback's
// rendering still runs.
import { lazy, Suspense, useMemo, useState } from 'react';
import { diffLines } from 'diff';
const TRUNCATE_LINES = 500;
// In-memory cache. Key on path + cheap content hash so two readers of
// the same file don't recompute the line set. The cache stores the
// already-computed DiffLine[] used by both the inline fallback and the
// rich viewer's summary stats.
const diffCache = new Map();
export function clearDiffViewerCache() {
    diffCache.clear();
}
const LazyRichViewer = lazy(() => import('react-diff-viewer-continued').then(m => ({ default: m.default })));
export function DiffViewer({ path, operation, original, current, fallbackOnly = false, initialMode = 'unified', }) {
    const [showAll, setShowAll] = useState(false);
    const [mode, setMode] = useState(initialMode);
    // Resolve effective contents for the diff. 'create' treats null
    // original as empty string so the viewer can render a full-add. Same
    // for 'delete' against current.
    const a = original ?? (operation === 'create' ? '' : null);
    const b = current ?? (operation === 'delete' ? '' : null);
    const lines = useMemo(() => {
        if (a === null || b === null) {
            return { error: 'Diff unavailable — content snapshot missing.' };
        }
        const key = `${path}\0${cheapHash(a)}\0${cheapHash(b)}`;
        const cached = diffCache.get(key);
        if (cached)
            return cached;
        try {
            const computed = computeUnifiedDiff(a, b);
            diffCache.set(key, computed);
            return computed;
        }
        catch (err) {
            return { error: err.message };
        }
    }, [path, a, b]);
    if ('error' in lines) {
        return _jsx("div", { className: "ds-diff-empty", children: lines.error });
    }
    if (lines.length === 0) {
        return _jsx("div", { className: "ds-diff-empty", children: "No differences." });
    }
    const slice = showAll ? lines : lines.slice(0, TRUNCATE_LINES);
    const truncated = lines.length > slice.length;
    const language = languageForPath(path);
    // ── Rich-viewer path ──────────────────────────────────────────────────────
    //
    // Truncate the source content to roughly TRUNCATE_LINES of changed
    // context so the rich viewer doesn't blow up on huge files. We pass
    // the entire string when within budget; otherwise we slice both sides
    // to the first N lines and let the inline "Show all" expand to the
    // full content.
    if (!fallbackOnly && a !== null && b !== null) {
        const fitsBudget = lines.length <= TRUNCATE_LINES || showAll;
        const oldValue = fitsBudget ? a : truncateLines(a, TRUNCATE_LINES);
        const newValue = fitsBudget ? b : truncateLines(b, TRUNCATE_LINES);
        return (_jsxs("div", { className: "ds-diff-block ds-diff-block--rich", "data-language": language, children: [_jsxs("div", { className: "ds-diff-toolbar", children: [_jsx("span", { className: "ds-diff-toolbar-stats", children: summary(lines) }), _jsx("div", { className: "ds-diff-toolbar-spacer" }), _jsx("button", { type: "button", className: `ds-diff-mode-toggle ${mode === 'unified' ? 'ds-diff-mode-toggle--active' : ''}`, onClick: () => setMode('unified'), "aria-pressed": mode === 'unified', children: "Unified" }), _jsx("button", { type: "button", className: `ds-diff-mode-toggle ${mode === 'split' ? 'ds-diff-mode-toggle--active' : ''}`, onClick: () => setMode('split'), "aria-pressed": mode === 'split', children: "Side by side" })] }), _jsx(Suspense, { fallback: _jsx(InlineFallback, { slice: slice }), children: _jsx(RichDiff, { oldValue: oldValue, newValue: newValue, split: mode === 'split' }) }), !fitsBudget && (_jsxs("button", { type: "button", className: "ds-diff-show-all", onClick: () => setShowAll(true), children: ["Show all ", lines.length, " lines"] }))] }));
    }
    // ── Inline fallback ──────────────────────────────────────────────────────
    //
    // SSR, tests, or any caller that explicitly opts in. Renders the
    // pre-formatted unified diff in plain DOM with no third-party
    // dependencies. The class names exactly match the styles already
    // shipped in DevShellStyles, so the fallback is visually consistent
    // with the rich viewer's theme.
    return (_jsxs("div", { className: "ds-diff-block", "data-language": language, children: [_jsx(InlineFallback, { slice: slice }), truncated && (_jsxs("button", { type: "button", className: "ds-diff-show-all", onClick: () => setShowAll(true), children: ["Show all ", lines.length, " lines"] }))] }));
}
// ── Subcomponents ──────────────────────────────────────────────────────────
function InlineFallback({ slice }) {
    return (_jsx("pre", { className: "ds-diff-pre", children: slice.map((l, i) => (_jsxs("div", { className: `ds-diff-line ds-diff-line--${l.kind}`, children: [_jsx("span", { className: "ds-diff-line-marker", children: l.kind === 'add' ? '+' : l.kind === 'remove' ? '-' : ' ' }), _jsx("span", { className: "ds-diff-line-text", children: l.text })] }, i))) }));
}
// Wraps the lazy-loaded third-party viewer so we can hand it our theme
// hooks and a stable prop shape. The library handles the actual prism
// syntax highlighting + add/remove paint; we only steer the colors via
// the styles map.
function RichDiff({ oldValue, newValue, split, }) {
    const styles = useMemo(() => ({
        diffContainer: {
            background: 'transparent',
            fontFamily: 'var(--f-mono, ui-monospace, monospace)',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--ds-text)',
        },
        contentText: {
            color: 'var(--ds-text)',
        },
        gutter: {
            background: 'transparent',
            color: 'var(--ds-text-3)',
            fontFamily: 'var(--f-mono, ui-monospace, monospace)',
            borderRight: '1px solid var(--c-border, rgba(255,255,255,0.06))',
        },
        addedGutter: {
            background: 'rgba(0,214,143,0.10)',
            color: 'var(--c-success, #00D68F)',
        },
        removedGutter: {
            background: 'rgba(255,60,119,0.10)',
            color: 'var(--c-error, #FF3C77)',
        },
        addedLine: {
            background: 'rgba(0,214,143,0.07)',
        },
        removedLine: {
            background: 'rgba(255,60,119,0.07)',
        },
        wordAdded: {
            background: 'rgba(0,214,143,0.22)',
            color: 'var(--ds-text)',
        },
        wordRemoved: {
            background: 'rgba(255,60,119,0.22)',
            color: 'var(--ds-text)',
        },
        emptyLine: {
            background: 'transparent',
        },
    }), []);
    return (_jsx(LazyRichViewer, { oldValue: oldValue, newValue: newValue, splitView: split, useDarkTheme: true, hideLineNumbers: false, showDiffOnly: true, styles: styles }));
}
// Compute a flat line-by-line diff using jsdiff's diffLines. The output
// preserves the order of the original sequence (no inversion) so the
// inline fallback renders the same direction as the rich viewer.
function computeUnifiedDiff(a, b) {
    if (a === '' && b === '')
        return [];
    const changes = diffLines(a, b);
    const out = [];
    for (const c of changes) {
        // Each change's value is one or more lines joined; split and stamp
        // each. jsdiff includes a trailing newline; strip a trailing empty
        // string so we don't render a phantom blank row at the end of every
        // hunk.
        const parts = c.value.split('\n');
        if (parts.length > 0 && parts[parts.length - 1] === '')
            parts.pop();
        const kind = c.added ? 'add' : c.removed ? 'remove' : 'context';
        for (const text of parts)
            out.push({ kind, text });
    }
    return out;
}
// Summary string for the toolbar. "+12 / -3" style, computed from the
// line set so it matches the inline fallback's "+N / -M" totals one-for-one.
function summary(lines) {
    let add = 0, rem = 0;
    for (const l of lines) {
        if (l.kind === 'add')
            add++;
        else if (l.kind === 'remove')
            rem++;
    }
    return `+${add} / -${rem}`;
}
// Cheap content hash for cache keying. Not cryptographic — collisions
// inside one session don't matter because the upstream content has
// already been compared by the modal logic that produced the diff in
// the first place.
function cheapHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++)
        h = (h * 33) ^ s.charCodeAt(i);
    return (h >>> 0).toString(36) + ':' + s.length;
}
// Truncate a string to its first N lines preserving the final newline
// when the original had one. Used to hand a manageable chunk to the
// rich viewer when the full diff is over the limit.
function truncateLines(s, n) {
    const parts = s.split('\n');
    if (parts.length <= n)
        return s;
    return parts.slice(0, n).join('\n') + '\n';
}
// Language detection by extension. Mirrors the Monaco map in
// MonacoFileEditor.tsx so the diff highlighter and the editor agree on
// the same set of recognized languages.
export function languageForPath(path) {
    const base = path.toLowerCase();
    const ext = base.includes('.') ? base.slice(base.lastIndexOf('.') + 1) : '';
    switch (ext) {
        case 'ts': return 'typescript';
        case 'tsx': return 'tsx';
        case 'js': return 'javascript';
        case 'jsx': return 'jsx';
        case 'json': return 'json';
        case 'css': return 'css';
        case 'md':
        case 'mdx': return 'markdown';
        case 'py': return 'python';
        case 'html':
        case 'htm': return 'html';
        case 'yml':
        case 'yaml': return 'yaml';
        case 'sh':
        case 'bash': return 'bash';
        case 'sql': return 'sql';
        case 'toml': return 'toml';
        default: {
            // Dockerfile is a special-case base name.
            if (base.endsWith('dockerfile') || base.endsWith('.dockerfile'))
                return 'dockerfile';
            return 'plaintext';
        }
    }
}
//# sourceMappingURL=DiffViewer.js.map