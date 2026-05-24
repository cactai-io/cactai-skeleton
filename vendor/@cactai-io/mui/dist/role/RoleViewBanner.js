'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/role/RoleViewBanner.tsx
//
// Task 9 of the v1.2 commit-flow rebuild.
//
// When the developer is viewing a file or page in role-view that has
// pending code edits (any pending_files row whose path matches the file
// being rendered, where the operation is 'edit' or 'create' and the
// file is not a config file), render a non-intrusive banner at the top
// of the role-view pane:
//
//   "You have pending code changes that aren't in this preview. Commit
//    and wait for the deploy to see them."
//
// Behavior per the Decisions spec:
//
//   - Banner is dismissible per session (sessionStorage flag keyed per
//     project).
//   - Banner does NOT appear for config-token edits or
//     skeleton.config.json patches — those preview live in the same
//     React tree and don't need the warning. We share the
//     `previewBehaviorFor` helper with FileTree's live-preview
//     indicator so the two surfaces never disagree.
//   - The eligibility check ignores rename/move/delete operations —
//     those don't have "pending code that won't appear" semantics in
//     the way the banner addresses. (A rename without a content
//     change has nothing to show in role-view differently; a delete
//     would remove a file that's still serving in the deployed
//     preview, but that's a separate UX problem.)
//
// Wire-up:
//   - DevShell observes pending files and the current role-view path
//     (when known), passes them in here, and includes the banner at
//     the top of the role-view pane. The component returns null when
//     no eligible pending file is present, so it's safe to include
//     unconditionally.
//   - The "current role-view path" is best-effort. When the developer
//     navigates to a route in the previewed app, the StudioOverlay
//     surface knows the active skill; the DevShell maps that back to
//     the source file path. When the mapping isn't available, this
//     component treats ANY pending non-config code edit as eligible
//     (the banner says "pending code changes that aren't in this
//     preview" — without a specific path mapping, that statement is
//     still true).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { previewBehaviorFor } from '../commit/types.js';
const DISMISS_KEY_PREFIX = 'cactai_role_view_banner_dismissed:';
function dismissKey(projectId) {
    return `${DISMISS_KEY_PREFIX}${projectId}`;
}
// Eligibility for surfacing the banner.
//   - operation must be 'edit' or 'create' (no path-only ops; no delete).
//   - file must be a code file, i.e. previewBehaviorFor === 'needs_deploy'.
//   - if activeRoleViewPath is provided, the path must match.
function eligibleFor(file, activeRoleViewPath) {
    if (file.operation !== 'edit' && file.operation !== 'create')
        return false;
    if (previewBehaviorFor(file.path) !== 'needs_deploy')
        return false;
    if (activeRoleViewPath && file.path !== activeRoleViewPath)
        return false;
    return true;
}
export function RoleViewBanner({ projectId, pendingFiles, activeRoleViewPath, onDismiss, }) {
    const [dismissed, setDismissed] = useState(false);
    // Read the dismissal flag on mount and on projectId change. We can't
    // rely on a stable identity for the sessionStorage layer between
    // renders, so we read once and keep the result in state. The flag is
    // a one-way switch within a session — once dismissed it stays
    // dismissed until the tab closes.
    useEffect(() => {
        try {
            if (typeof sessionStorage === 'undefined')
                return;
            const v = sessionStorage.getItem(dismissKey(projectId));
            setDismissed(v === '1');
        }
        catch {
            // sessionStorage disabled — banner stays visible until dismissed
            // within this render, at which point we keep the dismissal in
            // memory anyway.
        }
    }, [projectId]);
    const hasEligible = useMemo(() => pendingFiles.some(f => eligibleFor(f, activeRoleViewPath)), [pendingFiles, activeRoleViewPath]);
    const handleDismiss = useCallback(() => {
        setDismissed(true);
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(dismissKey(projectId), '1');
            }
        }
        catch { /* non-fatal */ }
        onDismiss?.();
    }, [projectId, onDismiss]);
    if (!hasEligible || dismissed)
        return null;
    // The banner copy is the spec verbatim. Adding a small action
    // affordance (the dismiss button) keeps it from being modal — the
    // developer can ignore it and keep working.
    return (_jsxs("div", { className: "ds-role-view-banner", role: "status", "aria-live": "polite", children: [_jsx("span", { className: "ds-role-view-banner-icon", "aria-hidden": "true", children: "\u25B2" }), _jsx("span", { className: "ds-role-view-banner-text", children: "You have pending code changes that aren't in this preview. Commit and wait for the deploy to see them." }), _jsx("button", { type: "button", className: "ds-role-view-banner-dismiss", onClick: handleDismiss, "aria-label": "Dismiss banner", children: "\u00D7" })] }));
}
//# sourceMappingURL=RoleViewBanner.js.map