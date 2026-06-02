import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/panels/UpdateAvailableModal.tsx
//
// Surfaces the platform's currently-pending update for this app. Two
// states:
//
//   - preview: shows the version delta (current platform SHA vs latest)
//              and a primary "Apply update" button. The button posts to
//              /api/devshell/update which kicks the platform-side
//              applyUpdate flow.
//
//   - applied: after a successful apply, the platform returns a PR URL.
//              The modal swaps to a success state with a link to the PR
//              and a brief note about what happens next (PR review +
//              merge → next Vercel deploy carries the update).
//
// Errors render inline; the user can retry from the same modal without
// closing.
import { useState } from 'react';
export function UpdateAvailableModal({ open, onClose, currentPlatformSha, latestPlatformSha, onApply, }) {
    const [working, setWorking] = useState(false);
    const [result, setResult] = useState(null);
    if (!open)
        return null;
    const handleApply = async () => {
        setWorking(true);
        try {
            const res = await onApply();
            setResult(res);
        }
        finally {
            setWorking(false);
        }
    };
    const shortenSha = (s) => s ? s.slice(0, 7) : '—';
    return (_jsx("div", { "data-cactai-shell": true, role: "dialog", "aria-modal": "true", "aria-label": "Platform update", onClick: onClose, style: {
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }, children: _jsxs("div", { onClick: (e) => e.stopPropagation(), style: {
                background: 'var(--ds-elevated, #1a1a24)',
                color: 'var(--ds-text, #e8e8f0)',
                border: '1px solid var(--ds-border, #2e2e3c)',
                borderRadius: 12,
                padding: 24,
                maxWidth: 520,
                width: '100%',
                lineHeight: 1.6,
                fontSize: 14,
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }, children: [!result && (_jsxs(_Fragment, { children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 8 }, children: "Cactai platform update available" }), _jsxs("p", { style: { marginTop: 0, color: 'var(--ds-text-2)' }, children: ["The platform-managed parts of your app (the DevShell bundle, the API proxies, the workflow plumbing) have new code on the latest Cactai release. Applying this update opens a pull request against your ", _jsx("code", { children: "dev" }), " branch with the file changes for your review."] }), _jsxs("div", { style: {
                                marginTop: 16, marginBottom: 16,
                                padding: 12,
                                background: 'var(--ds-surface)',
                                border: '1px solid var(--ds-border-soft)',
                                borderRadius: 8,
                                fontFamily: 'var(--f-mono)',
                                fontSize: 12,
                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { style: { color: 'var(--ds-text-3)' }, children: "Your app" }), _jsx("span", { children: shortenSha(currentPlatformSha) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4 }, children: [_jsx("span", { style: { color: 'var(--ds-text-3)' }, children: "Latest" }), _jsx("span", { style: { color: 'var(--c-accent, #5fb6ff)' }, children: shortenSha(latestPlatformSha) })] })] }), _jsx("p", { style: { fontSize: 12.5, color: 'var(--ds-text-3)', marginTop: 0, marginBottom: 16 }, children: "Your own application code is not touched. Only the platform-managed paths (vendor bundles + the Cactai-owned API routes) are updated. Review the PR diff before merging." }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx("button", { onClick: onClose, disabled: working, style: {
                                        padding: '8px 14px',
                                        fontSize: 13,
                                        background: 'transparent',
                                        color: 'var(--ds-text-2)',
                                        border: '1px solid var(--ds-border)',
                                        borderRadius: 6,
                                        cursor: working ? 'wait' : 'pointer',
                                    }, children: "Not now" }), _jsx("button", { onClick: handleApply, disabled: working, style: {
                                        padding: '8px 18px',
                                        fontSize: 13,
                                        background: 'var(--ds-grad-135, var(--c-accent, #5fb6ff))',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: working ? 'wait' : 'pointer',
                                        fontWeight: 600,
                                    }, children: working ? 'Preparing update…' : 'Apply update' })] })] })), result && result.ok && result.pr_url && (_jsxs(_Fragment, { children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 8 }, children: "Update PR opened" }), _jsxs("p", { style: { marginTop: 0, color: 'var(--ds-text-2)' }, children: [result.files_changed ?? 0, " files changed across the platform-managed paths. Review and merge the PR in your GitHub repo \u2014 Vercel will redeploy your app from", ' ', _jsx("code", { children: "dev" }), " automatically once the merge lands."] }), _jsxs("div", { style: { marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx("a", { href: result.pr_url, target: "_blank", rel: "noopener noreferrer", style: {
                                        padding: '8px 18px',
                                        fontSize: 13,
                                        background: 'var(--ds-grad-135, var(--c-accent, #5fb6ff))',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                    }, children: "Open PR \u2197" }), _jsx("button", { onClick: onClose, style: {
                                        padding: '8px 14px',
                                        fontSize: 13,
                                        background: 'transparent',
                                        color: 'var(--ds-text-2)',
                                        border: '1px solid var(--ds-border)',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                    }, children: "Close" })] })] })), result && result.already_up_to_date && (_jsxs(_Fragment, { children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 8 }, children: "Already up to date" }), _jsx("p", { style: { marginTop: 0, color: 'var(--ds-text-2)' }, children: "Your app already has the latest platform-managed files. Nothing to apply." }), _jsx("div", { style: { marginTop: 20, display: 'flex', justifyContent: 'flex-end' }, children: _jsx("button", { onClick: onClose, style: {
                                    padding: '8px 18px',
                                    fontSize: 13,
                                    background: 'var(--ds-grad-135, var(--c-accent, #5fb6ff))',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }, children: "Got it" }) })] })), result && !result.ok && !result.already_up_to_date && (_jsxs(_Fragment, { children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 8, color: 'var(--c-warning, #FFB44D)' }, children: "Update couldn't apply" }), _jsx("p", { style: { marginTop: 0, color: 'var(--ds-text-2)', fontFamily: 'var(--f-mono)', fontSize: 12 }, children: result.error ?? 'unknown error' }), _jsx("p", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "Your repo is unchanged. Try again, or check your GitHub connection from the Project settings panel." }), _jsxs("div", { style: { marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx("button", { onClick: () => { setResult(null); }, style: {
                                        padding: '8px 18px',
                                        fontSize: 13,
                                        background: 'var(--ds-grad-135, var(--c-accent, #5fb6ff))',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }, children: "Try again" }), _jsx("button", { onClick: onClose, style: {
                                        padding: '8px 14px',
                                        fontSize: 13,
                                        background: 'transparent',
                                        color: 'var(--ds-text-2)',
                                        border: '1px solid var(--ds-border)',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                    }, children: "Close" })] })] }))] }) }));
}
//# sourceMappingURL=UpdateAvailableModal.js.map