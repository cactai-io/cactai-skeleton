// packages/mui/src/commit/BranchIndicator.tsx
// Branch indicator for the directory viewer header (Phase 7).
//
// Layout per devshell-directory-viewer.md "Branch Indicator":
//
//   [⎇] dev — last commit: "chore: apply structure stage decisions" — 3 minutes ago
//
// Optional dropdown with:
//   - View branches on GitHub (external link)
//   - Recent commit list (max 10) — clicking opens the inline diff viewer
//
// The component is pure: takes the resolved branch info as props and
// emits actions via callbacks. The host (DevShell.tsx) fetches branch
// info from the platform's /v1/devshell/repo/branch endpoint (or the
// skeleton's /api/github/branch equivalent).
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function BranchIndicator(props) {
    const { branch, lastCommit, recentCommits = [], branchesUrl, onCommitClick, icon } = props;
    const [open, setOpen] = useState(false);
    const truncatedMessage = lastCommit
        ? truncate(lastCommit.message, 60)
        : '';
    const relative = lastCommit ? relativeTime(lastCommit.timestamp) : '';
    return (_jsxs("div", { style: {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            fontSize: 12,
            fontFamily: 'var(--f-ui, system-ui)',
            color: 'var(--ds-text-2, #A0A0B8)',
            background: 'var(--ds-surface-2, transparent)',
            border: '1px solid var(--ds-border-1, #25253A)',
            borderRadius: 4,
            cursor: recentCommits.length > 0 || branchesUrl ? 'pointer' : 'default',
            userSelect: 'none',
        }, onClick: () => {
            if (recentCommits.length > 0 || branchesUrl)
                setOpen(o => !o);
        }, role: "button", "aria-haspopup": recentCommits.length > 0 || branchesUrl ? 'menu' : undefined, "aria-expanded": open, children: [_jsx("span", { style: { fontSize: 14, lineHeight: 1, opacity: 0.7 }, children: icon ?? '⎇' }), _jsx("span", { style: { fontWeight: 600, color: 'var(--ds-text, #E8E8F0)' }, children: branch }), lastCommit ? (_jsxs(_Fragment, { children: [_jsx("span", { style: { opacity: 0.5 }, children: "\u2014" }), _jsx("span", { title: lastCommit.message, children: truncatedMessage }), _jsx("span", { style: { opacity: 0.5 }, children: "\u2014" }), _jsx("span", { style: { opacity: 0.7 }, title: lastCommit.timestamp, children: relative })] })) : (_jsx("span", { style: { opacity: 0.5 }, children: "\u2014 resolving\u2026" })), (recentCommits.length > 0 || branchesUrl) && (_jsx("span", { style: { opacity: 0.5, marginLeft: 4, fontSize: 10 }, children: open ? '▴' : '▾' })), open && (_jsxs("div", { style: {
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    minWidth: 320,
                    maxWidth: 480,
                    background: 'var(--ds-surface-1, #15151F)',
                    border: '1px solid var(--ds-border-2, #25253A)',
                    borderRadius: 6,
                    padding: '6px 0',
                    zIndex: 1000,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    cursor: 'default',
                }, role: "menu", onClick: (e) => e.stopPropagation(), children: [recentCommits.length === 0 && (_jsx("div", { style: { padding: '8px 12px', color: 'var(--ds-text-3, #7A7A8E)', fontSize: 11 }, children: "No recent commits." })), recentCommits.map(c => (_jsxs("button", { role: "menuitem", onClick: () => {
                            onCommitClick?.(c.sha);
                            setOpen(false);
                        }, style: {
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ds-text, #E8E8F0)',
                            padding: '8px 12px',
                            fontSize: 12,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }, onMouseEnter: (e) => (e.currentTarget.style.background = 'var(--ds-surface-2, rgba(255,255,255,0.04))'), onMouseLeave: (e) => (e.currentTarget.style.background = 'transparent'), children: [_jsx("div", { style: { fontWeight: 500 }, children: truncate(c.message, 56) }), _jsxs("div", { style: { fontSize: 10, opacity: 0.6, marginTop: 2 }, children: [c.sha.slice(0, 7), " \u00B7 ", c.author, " \u00B7 ", relativeTime(c.timestamp)] })] }, c.sha))), branchesUrl && (_jsx("a", { href: branchesUrl, target: "_blank", rel: "noreferrer", onClick: () => setOpen(false), style: {
                            display: 'block',
                            padding: '8px 12px',
                            fontSize: 11,
                            color: 'var(--ds-text-2, #A0A0B8)',
                            textDecoration: 'none',
                            borderTop: recentCommits.length > 0 ? '1px solid var(--ds-border-1, #25253A)' : undefined,
                        }, children: "View branches on GitHub \u2192" }))] }))] }));
}
// ── Helpers ─────────────────────────────────────────────────────────────
function truncate(s, n) {
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
function relativeTime(iso) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    if (Number.isNaN(then))
        return iso;
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60)
        return 'just now';
    if (diffSec < 3600)
        return `${Math.floor(diffSec / 60)} minute${Math.floor(diffSec / 60) === 1 ? '' : 's'} ago`;
    if (diffSec < 86400)
        return `${Math.floor(diffSec / 3600)} hour${Math.floor(diffSec / 3600) === 1 ? '' : 's'} ago`;
    const days = Math.floor(diffSec / 86400);
    if (days < 30)
        return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12)
        return `${months} month${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
}
//# sourceMappingURL=BranchIndicator.js.map