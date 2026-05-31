import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { isLocal } from './types.js';
function statusFor(state) {
    if (isLocal(state))
        return 'syncing';
    return 'synced';
}
function colorFor(status) {
    switch (status) {
        case 'synced': return 'var(--c-success, #28C940)';
        case 'syncing': return 'var(--c-warning, #FFB44D)';
        case 'error': return 'var(--c-error, #FF3C77)';
    }
}
function statusLabel(state) {
    if (isLocal(state)) {
        const n = state.uncommittedFiles.length;
        return `${n} uncommitted`;
    }
    return 'synced';
}
export function SyncIndicator({ state }) {
    const status = statusFor(state);
    const color = colorFor(status);
    const branch = state.branch;
    const statusText = statusLabel(state);
    return (_jsxs("span", { className: "ds-sync-indicator", role: "status", "aria-live": "polite", "data-branch": branch, style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { "aria-hidden": "true", title: status, style: {
                    display: 'inline-block',
                    width: 8, height: 8, borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                    flexShrink: 0,
                } }), _jsxs("span", { className: "ds-sync-branch", children: ["Branch /", branch] }, `b:${branch}`), _jsx("span", { className: "ds-sync-sep", "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { className: "ds-sync-status", children: statusText }, `s:${statusText}`)] }));
}
//# sourceMappingURL=SyncIndicator.js.map