'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/commit/CommitHistoryModal.tsx
//
// Task 7 of the v1.2 commit-flow rebuild — DevShell-originated commit
// history modal.
//
// Source: /api/history/commits (paginated, 20/page) plus
// /api/history/commits/[sha]/files lazily on row expand. Only commits
// made through the DevShell are recorded in commit_log and appear here
// — commits via git CLI or the GitHub web UI are intentionally invisible
// to this surface.
//
// UI shape:
//   Header
//     - "Commit history" title + "<N> commit(s)" subtitle
//     - Close (×) button
//   Body
//     - One group per commit, reverse-chronological order.
//     - Each group header: date · sha (7-char) · message.
//     - Files within a group: sorted by last_edited_at descending; each
//       row shows operation badge + path (+ "→ new/path" for rename/move)
//       + diff summary `+N / -M`.
//     - Edit/create/delete rows are expandable to show inline diff
//       (renders via DiffViewer using the snapshot the commit route
//       persisted to commit_log_files). Rename/move rows show the path
//       change inline without an expansion.
//   Footer
//     - "View on GitHub" deep-link to dev branch's commit list.
//     - "Load older" button when has_more is true.
//     - Close button.
//
// Behavior:
//   - On mount, fetch the first page.
//   - "Load older" appends the next page (cursor = oldest committed_at
//     of the current set).
//   - Per-file expand fetches files for the parent commit if not
//     already loaded; the result caches per sha.
//   - Escape closes (calls onClose). Backdrop click also closes.
//
// Wire-up:
//   - The parent (DevShell) sets `repoUrl` so "View on GitHub" links to
//     the developer's own fork. If absent, the button is hidden.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DiffViewer } from '../diff/DiffViewer.js';
const PAGE_SIZE = 20;
const DEFAULT_RANGE = { kind: 'all' };
// Translate the dropdown choice into `from` / `to` query params. `to` is
// always omitted for week/month/quarter — those are "since X" filters.
// The custom variant honors whatever the picker set, including nulls
// (an unbounded side stays unbounded).
function rangeToParams(range) {
    if (range.kind === 'all')
        return {};
    if (range.kind === 'custom') {
        const out = {};
        if (range.fromIso)
            out.from = range.fromIso;
        if (range.toIso)
            out.to = range.toIso;
        return out;
    }
    const days = range.kind === 'week' ? 7 : range.kind === 'month' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return { from: since };
}
// Stringify a TimeRangeChoice for the cache key + the "you're filtered"
// summary line under the header.
function rangeLabel(range) {
    switch (range.kind) {
        case 'all': return 'All time';
        case 'week': return 'Last 7 days';
        case 'month': return 'Last 30 days';
        case 'quarter': return 'Last 90 days';
        case 'custom': {
            const f = range.fromIso ? formatDateOnly(range.fromIso) : '…';
            const t = range.toIso ? formatDateOnly(range.toIso) : '…';
            return `${f} → ${t}`;
        }
    }
}
function formatDateOnly(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}
// Convert an `<input type="date">` yyyy-mm-dd value to a UTC midnight
// ISO timestamp. Empty string → null. Used by the custom-range picker.
function dateInputToIso(v, mode) {
    if (!v)
        return null;
    // The end of a day is "next day 00:00 UTC" so the filter is exclusive
    // on the right side, matching the server's `< committed_at` semantics
    // for `to`. The start is inclusive.
    const base = new Date(`${v}T00:00:00.000Z`);
    if (Number.isNaN(base.getTime()))
        return null;
    if (mode === 'end')
        base.setUTCDate(base.getUTCDate() + 1);
    return base.toISOString();
}
function isoToDateInput(iso) {
    if (!iso)
        return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '';
    return d.toISOString().slice(0, 10);
}
function operationBadge(op) {
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
    return op === 'edit' || op === 'create' || op === 'delete';
}
function shortSha(sha) {
    return sha.slice(0, 7);
}
function formatCommitDate(iso) {
    // Compact local time — Mar 5, 14:08. Year on hover via title.
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
export function CommitHistoryModal({ repoCommitsUrl, onRevertCommit, fetchFn, onClose, }) {
    const fetcher = fetchFn ?? ((...args) => fetch(...args));
    const [range, setRange] = useState(DEFAULT_RANGE);
    const [rangePickerOpen, setRangePickerOpen] = useState(false);
    const [commits, setCommits] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Per-sha lazy files cache, plus loading-by-sha tracking so the
    // expand chevron can spin while in flight.
    const [filesBySha, setFilesBySha] = useState({});
    const [expandedCommits, setExpandedCommits] = useState(new Set());
    const [expandedFiles, setExpandedFiles] = useState(new Set()); // keyed `${sha}\0${path}`
    // Per-row action menu — opens off the kebab on each commit. Holds the
    // commit sha to disambiguate which row's menu is showing.
    const [openMenuSha, setOpenMenuSha] = useState(null);
    // Revert confirmation — set to the commit awaiting confirmation. Null
    // when no confirmation is pending.
    const [revertConfirm, setRevertConfirm] = useState(null);
    const fileRowKey = (sha, path) => `${sha}\0${path}`;
    // Build the query string for a list fetch. `cursor` is the pagination
    // upper bound (`?before=`); the filter params come from the current
    // range. Both are sent on every page so the result set stays
    // consistent across "Load older" clicks.
    const listUrl = useCallback((paginationCursor) => {
        const params = new URLSearchParams();
        const { from, to } = rangeToParams(range);
        if (from)
            params.set('from', from);
        if (to)
            params.set('to', to);
        if (paginationCursor)
            params.set('before', paginationCursor);
        const qs = params.toString();
        return qs ? `/api/history/commits?${qs}` : '/api/history/commits';
    }, [range]);
    // ── Initial load ──────────────────────────────────────────────────────────
    const loadFirstPage = useCallback(async () => {
        setLoading(true);
        setError(null);
        // Clear the previous result set so a slow filter change doesn't leave
        // stale rows visible while the new range loads.
        setCommits([]);
        setHasMore(false);
        setCursor(null);
        try {
            const res = await fetcher(listUrl(null), { credentials: 'same-origin' });
            if (!res.ok) {
                setError(`Failed to load commits (HTTP ${res.status}).`);
                setLoading(false);
                return;
            }
            const data = (await res.json());
            setCommits(data.commits ?? []);
            setHasMore(!!data.has_more);
            setCursor(data.next_cursor ?? null);
        }
        catch (err) {
            setError(`Failed to load commits — ${err.message}.`);
        }
        finally {
            setLoading(false);
        }
    }, [fetcher, listUrl]);
    useEffect(() => {
        void loadFirstPage();
    }, [loadFirstPage]);
    // ── Pagination ────────────────────────────────────────────────────────────
    const loadMore = useCallback(async () => {
        if (!cursor || loading)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetcher(listUrl(cursor), { credentials: 'same-origin' });
            if (!res.ok) {
                setError(`Failed to load older commits (HTTP ${res.status}).`);
                setLoading(false);
                return;
            }
            const data = (await res.json());
            // Append; defensively dedupe on commit_sha in case of race.
            setCommits(prev => {
                const seen = new Set(prev.map(c => c.commit_sha));
                const next = [...prev];
                for (const c of data.commits ?? [])
                    if (!seen.has(c.commit_sha))
                        next.push(c);
                return next;
            });
            setHasMore(!!data.has_more);
            setCursor(data.next_cursor ?? null);
        }
        catch (err) {
            setError(`Failed to load older commits — ${err.message}.`);
        }
        finally {
            setLoading(false);
        }
    }, [cursor, loading, fetcher, listUrl]);
    // ── Per-commit file fetch ─────────────────────────────────────────────────
    const ensureFilesLoaded = useCallback(async (sha) => {
        if (filesBySha[sha] !== undefined)
            return;
        setFilesBySha(prev => ({ ...prev, [sha]: 'loading' }));
        try {
            const res = await fetcher(`/api/history/commits/${encodeURIComponent(sha)}/files`, {
                credentials: 'same-origin',
            });
            if (!res.ok) {
                setFilesBySha(prev => ({ ...prev, [sha]: 'error' }));
                return;
            }
            const data = (await res.json());
            setFilesBySha(prev => ({ ...prev, [sha]: data.files ?? [] }));
        }
        catch {
            setFilesBySha(prev => ({ ...prev, [sha]: 'error' }));
        }
    }, [filesBySha, fetcher]);
    const toggleCommit = useCallback((sha) => {
        setExpandedCommits(prev => {
            const next = new Set(prev);
            if (next.has(sha)) {
                next.delete(sha);
            }
            else {
                next.add(sha);
                void ensureFilesLoaded(sha);
            }
            return next;
        });
    }, [ensureFilesLoaded]);
    const toggleFile = useCallback((sha, path) => {
        const key = fileRowKey(sha, path);
        setExpandedFiles(prev => {
            const next = new Set(prev);
            if (next.has(key))
                next.delete(key);
            else
                next.add(key);
            return next;
        });
    }, []);
    // ── Lifecycle ─────────────────────────────────────────────────────────────
    const closeBtnRef = useRef(null);
    useEffect(() => {
        closeBtnRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (revertConfirm) {
                    setRevertConfirm(null);
                    return;
                }
                if (openMenuSha) {
                    setOpenMenuSha(null);
                    return;
                }
                if (rangePickerOpen) {
                    setRangePickerOpen(false);
                    return;
                }
                onClose();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, openMenuSha, revertConfirm, rangePickerOpen]);
    // Close any open kebab menu when the developer clicks outside it. The
    // menu's own onClick stops propagation so this only fires for clicks
    // on the modal body / list rows / backdrop.
    useEffect(() => {
        if (!openMenuSha)
            return;
        const onDocClick = () => setOpenMenuSha(null);
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, [openMenuSha]);
    const totalShown = commits.length;
    // Sort files within a group by last_edited_at desc — spec.
    const groupFiles = useMemo(() => {
        const out = {};
        for (const sha of Object.keys(filesBySha)) {
            const val = filesBySha[sha];
            if (Array.isArray(val)) {
                out[sha] = [...val].sort((a, b) => (b.last_edited_at ?? '').localeCompare(a.last_edited_at ?? ''));
            }
        }
        return out;
    }, [filesBySha]);
    return (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "ds-commit-modal-card ds-commit-history-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "ds-commit-history-title", children: [_jsxs("div", { className: "ds-commit-modal-header", children: [_jsxs("div", { className: "ds-commit-modal-titles", children: [_jsx("div", { id: "ds-commit-history-title", className: "ds-commit-modal-title", children: "Commit history" }), _jsxs("div", { className: "ds-commit-modal-subtitle", children: [totalShown === 0
                                            ? (loading ? 'Loading…' : (range.kind === 'all' ? 'No commits yet' : 'No commits in this range'))
                                            : `${totalShown} commit${totalShown === 1 ? '' : 's'}${hasMore ? ' (more available)' : ''}`, range.kind !== 'all' && (_jsxs("span", { className: "ds-commit-history-filter-summary", children: [' · ', rangeLabel(range)] }))] })] }), _jsxs("div", { className: "ds-commit-modal-actions", children: [_jsxs("div", { className: "ds-commit-history-filter", children: [_jsx("label", { className: "ds-commit-history-filter-label", htmlFor: "ds-commit-history-range", children: "Range" }), _jsxs("select", { id: "ds-commit-history-range", className: "ds-commit-history-filter-select", value: range.kind, disabled: loading, onChange: (e) => {
                                                const v = e.target.value;
                                                if (v === 'custom') {
                                                    // Seed the custom picker with whatever we were on
                                                    // so the developer doesn't lose their dates when
                                                    // toggling through.
                                                    setRange(prev => prev.kind === 'custom'
                                                        ? prev
                                                        : { kind: 'custom', fromIso: null, toIso: null });
                                                    setRangePickerOpen(true);
                                                }
                                                else {
                                                    setRangePickerOpen(false);
                                                    setRange({ kind: v });
                                                }
                                            }, "aria-label": "Filter commits by time range", children: [_jsx("option", { value: "all", children: "All time" }), _jsx("option", { value: "week", children: "Last 7 days" }), _jsx("option", { value: "month", children: "Last 30 days" }), _jsx("option", { value: "quarter", children: "Last 90 days" }), _jsx("option", { value: "custom", children: "Custom\u2026" })] }), range.kind === 'custom' && (_jsx("button", { type: "button", className: "ds-commit-modal-link ds-commit-history-filter-edit", onClick: () => setRangePickerOpen(s => !s), disabled: loading, children: rangePickerOpen ? 'Close' : 'Edit dates' }))] }), _jsx("button", { ref: closeBtnRef, type: "button", className: "ds-commit-modal-close", onClick: onClose, "aria-label": "Close", children: "\u00D7" })] })] }), rangePickerOpen && range.kind === 'custom' && (_jsxs("div", { className: "ds-commit-history-range-picker", role: "group", "aria-label": "Custom date range", children: [_jsxs("label", { className: "ds-commit-history-range-field", children: [_jsx("span", { children: "From" }), _jsx("input", { type: "date", value: isoToDateInput(range.fromIso), onChange: (e) => setRange(prev => prev.kind === 'custom'
                                        ? { ...prev, fromIso: dateInputToIso(e.target.value, 'start') }
                                        : prev) })] }), _jsxs("label", { className: "ds-commit-history-range-field", children: [_jsx("span", { children: "To" }), _jsx("input", { type: "date", value: isoToDateInput(range.toIso ? new Date(new Date(range.toIso).getTime() - 1).toISOString() : null), onChange: (e) => setRange(prev => prev.kind === 'custom'
                                        ? { ...prev, toIso: dateInputToIso(e.target.value, 'end') }
                                        : prev) })] }), _jsx("button", { type: "button", className: "ds-commit-modal-link", onClick: () => setRange({ kind: 'custom', fromIso: null, toIso: null }), children: "Clear" })] })), error && _jsx("div", { className: "ds-commit-modal-error", role: "alert", children: error }), _jsx("div", { className: "ds-commit-modal-body ds-commit-history-body", children: commits.length === 0 && !loading ? (_jsx("div", { className: "ds-commit-modal-empty", children: "No commits to show. DevShell-originated commits will appear here." })) : (_jsx("ul", { className: "ds-commit-group-list", children: commits.map(commit => {
                            const isOpen = expandedCommits.has(commit.commit_sha);
                            const files = groupFiles[commit.commit_sha];
                            const fileState = filesBySha[commit.commit_sha];
                            return (_jsxs("li", { className: "ds-commit-group", children: [_jsxs("div", { className: "ds-commit-group-header-wrap", children: [_jsxs("button", { type: "button", className: "ds-commit-group-header", onClick: () => toggleCommit(commit.commit_sha), "aria-expanded": isOpen, children: [_jsx("span", { className: "ds-commit-group-chevron", children: isOpen ? '▾' : '▸' }), _jsx("span", { className: "ds-commit-group-date", title: new Date(commit.committed_at).toLocaleString(), children: formatCommitDate(commit.committed_at) }), _jsx("span", { className: "ds-commit-group-sha", children: shortSha(commit.commit_sha) }), _jsx("span", { className: "ds-commit-group-message", children: commit.message }), commit.reverts_sha && (_jsx("span", { className: "ds-commit-group-revert-pill", title: `Revert of ${commit.reverts_sha}`, children: "revert" }))] }), onRevertCommit && (_jsxs("div", { className: "ds-commit-group-actions", children: [_jsx("button", { type: "button", className: "ds-commit-group-kebab", "aria-label": "Commit actions", "aria-haspopup": "menu", "aria-expanded": openMenuSha === commit.commit_sha, onClick: () => setOpenMenuSha(s => (s === commit.commit_sha ? null : commit.commit_sha)), children: "\u22EF" }), openMenuSha === commit.commit_sha && (_jsx("div", { className: "ds-commit-group-menu", role: "menu", onClick: (e) => e.stopPropagation(), children: _jsx("button", { type: "button", role: "menuitem", className: "ds-commit-group-menu-item", onClick: () => {
                                                                setOpenMenuSha(null);
                                                                setRevertConfirm(commit);
                                                            }, children: "Revert this commit" }) }))] }))] }), isOpen && (_jsxs("div", { className: "ds-commit-group-body", children: [fileState === 'loading' && (_jsx("div", { className: "ds-commit-group-loading", children: "Loading files\u2026" })), fileState === 'error' && (_jsx("div", { className: "ds-commit-modal-error", role: "alert", children: "Could not load files for this commit." })), Array.isArray(files) && files.length === 0 && (_jsx("div", { className: "ds-commit-modal-empty", children: "No files recorded for this commit." })), Array.isArray(files) && files.length > 0 && (_jsx("ul", { className: "ds-commit-file-list", children: files.map(file => {
                                                    const expandKey = fileRowKey(commit.commit_sha, file.path);
                                                    const isFileOpen = expandedFiles.has(expandKey);
                                                    const showExpand = isExpandableOp(file.operation);
                                                    return (_jsxs("li", { className: "ds-commit-file-li", children: [_jsxs("div", { className: "ds-commit-file-row", "data-op": file.operation, children: [_jsx("button", { type: "button", className: "ds-commit-file-expand", "aria-label": isFileOpen ? 'Collapse diff' : 'Expand diff', "aria-expanded": isFileOpen, onClick: () => toggleFile(commit.commit_sha, file.path), disabled: !showExpand, style: { visibility: showExpand ? 'visible' : 'hidden' }, children: isFileOpen ? '▾' : '▸' }), _jsx("span", { className: "ds-commit-file-path", children: isPathChangeOp(file.operation) && file.new_path
                                                                            ? _jsxs(_Fragment, { children: [_jsx("span", { className: "ds-commit-file-path-old", children: file.path }), ' → ', _jsx("span", { className: "ds-commit-file-path-new", children: file.new_path })] })
                                                                            : file.path }), _jsx("span", { className: `ds-commit-op-badge ds-commit-op-badge--${file.operation}`, children: operationBadge(file.operation) }), _jsx("span", { className: "ds-commit-file-diff", children: isPathChangeOp(file.operation) ? (_jsx("span", { className: "ds-commit-file-diff-pathmove", children: "path change" })) : (_jsxs(_Fragment, { children: [_jsxs("span", { className: "ds-commit-file-diff-add", children: ["+", file.lines_added] }), ' / ', _jsxs("span", { className: "ds-commit-file-diff-remove", children: ["-", file.lines_removed] })] })) })] }), isFileOpen && showExpand && (_jsx("div", { className: "ds-commit-file-inline-diff", children: _jsx(DiffViewer, { path: file.path, operation: file.operation, original: file.original_content, current: file.current_content }) }))] }, file.path));
                                                }) }))] }))] }, commit.commit_sha));
                        }) })) }), _jsxs("div", { className: "ds-commit-modal-footer", children: [repoCommitsUrl && (_jsx("a", { className: "ds-commit-modal-link", href: repoCommitsUrl, target: "_blank", rel: "noopener noreferrer", children: "View on GitHub" })), hasMore && (_jsx("button", { type: "button", className: "ds-commit-modal-link", onClick: loadMore, disabled: loading, children: loading ? 'Loading…' : 'Load older' })), _jsx("div", { style: { flex: 1 } }), _jsx("button", { type: "button", className: "ds-commit-modal-cancel", onClick: onClose, children: "Close" })] }), revertConfirm && (_jsx("div", { className: "ds-commit-modal-confirm-overlay", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "ds-commit-revert-confirm-title", children: _jsxs("div", { className: "ds-commit-modal-confirm-card", children: [_jsx("div", { id: "ds-commit-revert-confirm-title", className: "ds-commit-modal-title", children: "Revert this commit?" }), _jsxs("div", { className: "ds-commit-modal-subtitle ds-commit-revert-confirm-sub", children: [_jsx("span", { className: "ds-commit-group-sha", children: shortSha(revertConfirm.commit_sha) }), ' ', _jsx("span", { className: "ds-commit-revert-confirm-msg", children: revertConfirm.message })] }), _jsx("div", { className: "ds-commit-modal-confirm-text", children: "This creates a new commit on dev that reverses the changes from this commit. The original commit stays in history." }), _jsxs("div", { className: "ds-commit-modal-confirm-actions", children: [_jsx("button", { type: "button", className: "ds-commit-modal-cancel", onClick: () => setRevertConfirm(null), children: "Cancel" }), _jsx("button", { type: "button", className: "ds-commit-modal-btn ds-commit-modal-btn-primary", autoFocus: true, onClick: () => {
                                            const target = revertConfirm;
                                            setRevertConfirm(null);
                                            if (onRevertCommit)
                                                onRevertCommit(target);
                                        }, children: "Revert commit" })] })] }) }))] }) }));
}
// Page size constant exported in case the parent wants to mirror it
// somewhere (e.g. for a "Showing N of M" label upstream). Currently
// unused; kept exported so future call sites don't reach into the
// modal's body for it.
export const COMMIT_HISTORY_PAGE_SIZE = PAGE_SIZE;
//# sourceMappingURL=CommitHistoryModal.js.map