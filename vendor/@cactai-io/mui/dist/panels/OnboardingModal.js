import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const WelcomeBody = ({ personalityName }) => (_jsxs(_Fragment, { children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 12 }, children: "Welcome to DevShell" }), _jsxs("ol", { style: { paddingLeft: 22, marginTop: 8 }, children: [_jsx("li", { style: { marginBottom: 12 }, children: "The first step is to describe your app idea in a few sentences. Use the example to help you structure your description; don't worry if you don't have all the details figured out yet. Start simple: \u201CI want to build a workout assistant\u201D or \u201CI want to build a marketplace.\u201D" }), _jsxs("li", { style: { marginBottom: 12 }, children: [_jsx("strong", { children: personalityName }), " will work with you to collect the information and make decisions. Once enough information is gathered, ", _jsx("strong", { children: personalityName }), " will build your app's core structure. Then you can use the ", _jsx("strong", { children: "Configuration" }), ' ', "page (the rail gear icon), the ", _jsx("strong", { children: "directory tree" }), " for manual code edits, and continue chatting with", ' ', _jsx("strong", { children: personalityName }), " to refine and expand. Use the", ' ', _jsx("strong", { children: "Plan" }), " button in the header for notes and the deferred backlog."] }), _jsxs("li", { style: { marginBottom: 12 }, children: ["After ", _jsx("strong", { children: personalityName }), " builds your app's core structure, you can test-drive your app using the", ' ', _jsx("strong", { children: "Test Drive" }), " button in the header."] })] })] }));
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
                        }, children: "Got it" }) })] }) }));
}
//# sourceMappingURL=OnboardingModal.js.map