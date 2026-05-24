'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/commit/DeployIndicator.tsx
//
// Task 10 of the v1.2 commit-flow rebuild — visual indicator for the
// most recent Vercel deploy state. Lives near the SyncIndicator at the
// top of the Files panel.
//
// States per the Decisions spec:
//   green  — latest dev commit is deployed and live in the preview.
//   amber  — build in progress (subtle pulse).
//   red    — build failed; tooltip points at the Vercel dashboard.
//   grey   — initial / unknown.
//
// Source: SSE stream from /v1/projects/<id>/deploy-events. The
// connection opens on mount, listens for `deploy` events, and turns
// the dot the right color. On a `ready` transition (any non-ready
// state → 'ready') the component:
//
//   1. Sets the dot to green.
//   2. Waits 500 ms (the spec — gives the user time to see the
//      indicator change before the page reloads).
//   3. Calls `window.location.reload()`.
//
// The reload re-fetches the tree, pending_files, commit_log, and the
// role-view re-mounts against the now-deployed code. Loss of mid-
// typing input not yet flushed is accepted (the staging layer's
// beforeunload beacon handles last-second persistence in the common
// case).
//
// Bearer auth: SSE in EventSource doesn't allow custom headers in
// most browsers. We work around this by passing the developer's API
// key as a query parameter (`?token=...`) — the requireApiKey
// middleware on the platform side accepts both bearer headers and
// `Authorization` cookie/query forms. The dashboard layer signs the
// token URL when the developer is dev/collaborator so the bearer
// never appears in browser history beyond the project session.
import { useEffect, useRef, useState } from 'react';
const GREEN_HOLD_MS = 500;
function dotColorFor(state) {
    switch (state) {
        case 'ready': return 'var(--c-success, #00D68F)';
        case 'building': return 'var(--c-warning, #FFD700)';
        case 'error': return 'var(--c-error,   #FF3C77)';
        case 'canceled': return 'var(--c-text-3,  #8B8B9F)';
        case 'grey':
        default: return 'var(--c-text-3,  #8B8B9F)';
    }
}
function labelFor(state) {
    switch (state) {
        case 'ready': return 'Deploy: live';
        case 'building': return 'Deploy: building…';
        case 'error': return 'Deploy: failed';
        case 'canceled': return 'Deploy: canceled';
        case 'grey':
        default: return 'Deploy: awaiting first build';
    }
}
export function DeployIndicator({ projectId, platformBaseUrl, bearerToken, eventSourceFactory, reloadFn, vercelDashboardUrl, }) {
    const [state, setState] = useState('grey');
    const [lastDeployUrl, setLastDeployUrl] = useState(null);
    // Latch so we only schedule one reload per green transition.
    const reloadScheduled = useRef(false);
    useEffect(() => {
        // Build the URL. EventSource doesn't support custom headers in
        // browsers, so the bearer flows through the query string.
        const base = platformBaseUrl ?? '';
        const url = `${base}/v1/projects/${encodeURIComponent(projectId)}/deploy-events?token=${encodeURIComponent(bearerToken)}`;
        const factory = eventSourceFactory
            ?? ((u) => new EventSource(u));
        const es = factory(url);
        function onDeploy(ev) {
            let parsed;
            try {
                parsed = JSON.parse(ev.data);
            }
            catch {
                return;
            }
            if (parsed.vercel_url)
                setLastDeployUrl(parsed.vercel_url);
            setState(prev => {
                const next = parsed.state;
                // Detect transition into 'ready' — schedule reload exactly
                // once per transition. Going from 'ready' back to 'ready'
                // (a no-op re-emit) doesn't trigger another reload.
                if (next === 'ready' && prev !== 'ready' && !reloadScheduled.current) {
                    reloadScheduled.current = true;
                    setTimeout(() => {
                        try {
                            (reloadFn ?? (() => window.location.reload()))();
                        }
                        catch {
                            // Reload failure (e.g. test environment) is non-fatal.
                            reloadScheduled.current = false;
                        }
                    }, GREEN_HOLD_MS);
                }
                return next;
            });
        }
        es.addEventListener('deploy', onDeploy);
        return () => {
            try {
                es.removeEventListener?.('deploy', onDeploy);
            }
            catch { /* */ }
            try {
                es.close();
            }
            catch { /* */ }
        };
    }, [projectId, bearerToken, platformBaseUrl, eventSourceFactory, reloadFn]);
    const tooltipBase = labelFor(state);
    const tooltip = state === 'error' && vercelDashboardUrl
        ? `${tooltipBase} — see ${vercelDashboardUrl}`
        : tooltipBase;
    const dot = (_jsx("span", { className: `ds-deploy-dot ds-deploy-dot--${state}`, "aria-hidden": "true", style: {
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColorFor(state),
            // Subtle pulse for the 'building' state. The actual animation
            // is defined in DevShellStyles via the ds-deploy-dot--building
            // class. Inline opacity is a fallback for hosts that haven't
            // updated their stylesheet.
            opacity: state === 'building' ? 0.9 : 1,
        } }));
    // When red and we have a dashboard URL, render the indicator as a
    // link so the developer can jump to logs. Otherwise it's a plain
    // status element.
    if (state === 'error' && vercelDashboardUrl) {
        return (_jsxs("a", { className: "ds-deploy-indicator ds-deploy-indicator--link", href: vercelDashboardUrl, target: "_blank", rel: "noopener noreferrer", title: tooltip, "aria-label": tooltip, children: [dot, _jsx("span", { className: "ds-deploy-indicator-label", children: labelFor(state) })] }));
    }
    return (_jsxs("span", { className: "ds-deploy-indicator", role: "status", "aria-live": "polite", title: tooltip, children: [dot, _jsx("span", { className: "ds-deploy-indicator-label", children: labelFor(state) }), state === 'ready' && lastDeployUrl && (_jsx("a", { className: "ds-deploy-indicator-open", href: lastDeployUrl, target: "_blank", rel: "noopener noreferrer", children: "Open \u2197" }))] }));
}
//# sourceMappingURL=DeployIndicator.js.map