import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatSyncLabel } from './types.js';
export function SyncIndicator({ state }) {
    const label = formatSyncLabel(state);
    // Split once on the middle dot so the separator can be styled
    // independently. The dot survives in its own span.
    const [branch, status] = label.split(' · ');
    // The branch + status are keyed so a transition between e.g.
    // "local · 2 uncommitted" → "local · 3 uncommitted" remounts the
    // status span and re-fires its fade-in animation. The branch span
    // remounts only when the branch itself changes, so the badge-pop
    // only fires on actual branch transitions, not status counter ticks.
    return (_jsxs("span", { className: "ds-sync-indicator", role: "status", "aria-live": "polite", "data-branch": state.branch, children: [_jsx("span", { className: "ds-sync-branch", children: branch }, `b:${branch}`), _jsx("span", { className: "ds-sync-sep", "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { className: "ds-sync-status", children: status }, `s:${status}`)] }));
}
//# sourceMappingURL=SyncIndicator.js.map