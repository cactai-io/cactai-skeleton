import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Locked welcome copy (v1.4). Single page — the old page-2 model-config
// picker is removed (everything runs Opus pre-build; the build model is
// chosen at the "Build It" gate), so there is nothing left for it to
// configure. "Ember" is substituted with the active personality name.
const WelcomeBody = ({ personalityName }) => (_jsxs(_Fragment, { children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 14 }, children: "Welcome to DevShell" }), _jsx("p", { style: { marginTop: 0, marginBottom: 12 }, children: "Congratulations! Your app is ready to build." }), _jsx("p", { style: { marginTop: 0, marginBottom: 12 }, children: "Next step, answer a few questions, make a few decisions, take a Test Drive." }), _jsxs("p", { style: { marginTop: 0, marginBottom: 12 }, children: ["Stuck? Ask ", _jsx("strong", { children: personalityName }), ". Change your mind? Go back and change your decision."] }), _jsx("p", { style: { marginTop: 0, marginBottom: 0 }, children: "Now lets get started\u2026" })] }));
export function OnboardingModal({ open, onClose, personalityName = 'Ember', }) {
    if (!open)
        return null;
    return (
    // data-cactai-shell on the overlay makes the --ds-* theme variables
    // resolve — without it this modal renders OUTSIDE the DevShell's
    // [data-cactai-shell] scope (it's a sibling mount in the host), so
    // var(--ds-elevated) etc. resolved to nothing and the card was
    // transparent (text sat on the bare backdrop). Explicit fallbacks
    // are a second line of defense if the stylesheet hasn't injected yet.
    _jsx("div", { "data-cactai-shell": true, role: "dialog", "aria-modal": "true", "aria-label": "Welcome to DevShell", onClick: onClose, style: {
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: {
                background: 'var(--ds-elevated, #1a1a24)',
                color: 'var(--ds-text, #e8e8f0)',
                border: '1px solid var(--ds-border, #2e2e3c)',
                borderRadius: 12,
                padding: 24,
                maxWidth: 560,
                width: '100%',
                lineHeight: 1.65,
                fontSize: 14,
                maxHeight: '85vh',
                overflow: 'auto',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }, children: [_jsx(WelcomeBody, { personalityName: personalityName }), _jsx("div", { style: { marginTop: 20, display: 'flex', justifyContent: 'flex-end' }, children: _jsx("button", { onClick: onClose, style: {
                            padding: '8px 16px',
                            fontSize: 13,
                            background: 'var(--ds-grad-135, var(--c-accent, #5fb6ff))',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                        }, children: "Next \u2192" }) })] }) }));
}
//# sourceMappingURL=OnboardingModal.js.map