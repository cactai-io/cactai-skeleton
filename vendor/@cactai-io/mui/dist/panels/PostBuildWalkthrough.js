import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// packages/mui/src/panels/PostBuildWalkthrough.tsx
//
// v1.4 post-build config walkthrough (LOCKED). After the first build completes
// we do NOT dump the developer on Test Drive — we run a guided tour of the App
// Config tabs the wizard decisions made visible. Per tab: "Configure now"
// (the host switches the rail to that tab's builder) or "Skip for later" (the
// host drops a backlog item). Reuses the config tabs as the surfaces — this is
// just the guided wrapper, no per-tab new UI. Host-mounted, like
// OnboardingModal / WorkflowCompletionModal.
import { useState } from 'react';
export function PostBuildWalkthrough({ open, tabs, onConfigure, onSkip, onClose, personalityName = 'Ember', }) {
    const [idx, setIdx] = useState(0);
    if (!open || tabs.length === 0)
        return null;
    const tab = tabs[Math.min(idx, tabs.length - 1)];
    const last = idx >= tabs.length - 1;
    const advance = () => { if (last)
        onClose();
    else
        setIdx(i => i + 1); };
    return (_jsx("div", { "data-cactai-shell": true, role: "dialog", "aria-modal": "true", "aria-label": "Set up your app", style: {
            position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }, children: _jsxs("div", { style: {
                background: 'var(--ds-elevated, #1a1a24)', color: 'var(--ds-text, #e8e8f0)',
                border: '1px solid var(--ds-border, #2e2e3c)', borderRadius: 12, padding: 24,
                maxWidth: 520, width: '100%', lineHeight: 1.6, fontSize: 14,
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }, children: [_jsxs("div", { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em',
                        color: 'var(--ds-text-secondary, #94a3b8)', marginBottom: 6 }, children: ["Set up your app \u00B7 ", idx + 1, " of ", tabs.length] }), _jsx("h2", { style: { fontSize: 17, fontWeight: 700, margin: 0, marginBottom: 8 }, children: tab.label }), _jsx("p", { style: { margin: 0, marginBottom: 18, color: 'var(--ds-text-secondary, #cfcfe0)' }, children: tab.description }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }, children: [_jsx("button", { onClick: () => { onSkip(tab.key); advance(); }, style: {
                                padding: '8px 14px', fontSize: 13, background: 'transparent',
                                color: 'var(--ds-text-secondary, #94a3b8)',
                                border: '1px solid var(--ds-border, #2e2e3c)', borderRadius: 6, cursor: 'pointer',
                            }, children: "Skip for later" }), _jsx("button", { onClick: () => onConfigure(tab.key), style: {
                                padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', border: 'none',
                                borderRadius: 6, cursor: 'pointer',
                                background: 'var(--ds-grad-135, var(--c-accent, #5fb6ff))',
                            }, children: "Configure now" })] }), _jsx("div", { style: { marginTop: 14, textAlign: 'right' }, children: _jsx("button", { onClick: advance, style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                            color: 'var(--ds-text-tertiary, #7a7a8e)' }, children: last ? `Finish — ${personalityName} will be in chat` : 'Decide later →' }) })] }) }));
}
// Derive the walkthrough tab set from the wizard's decisions — the same
// visibility rule the App Config rail should use (enabled capability → tab).
export function deriveWalkthroughTabs(opts) {
    const tabs = [
        { key: 'roles', label: 'Users & Roles', description: 'Review the default roles and what each can do. Rename, reorder, or add roles.' },
    ];
    if (opts.paid)
        tabs.push({ key: 'tiers', label: 'Accounts & Billing', description: 'Set your pricing tiers, add-ons, and what each tier includes.' });
    if (opts.ai)
        tabs.push({ key: 'providers', label: 'Providers', description: 'Confirm AI providers, key policy, and runtime models.' }, { key: 'ai-actions', label: 'AI Actions', description: 'Author reusable AI actions/prompts your app can run.' });
    if (opts.sharing)
        tabs.push({ key: 'sharing', label: 'Sharing', description: 'Choose how users share content — methods and what can be shared.' });
    if (opts.collaboration)
        tabs.push({ key: 'collaboration', label: 'Collaboration', description: 'Set co-owner / member roles and cross-tenant sharing.' });
    tabs.push({ key: 'design', label: 'Design', description: 'Fine-tune your theme tokens and layout.' });
    return tabs;
}
export default PostBuildWalkthrough;
//# sourceMappingURL=PostBuildWalkthrough.js.map