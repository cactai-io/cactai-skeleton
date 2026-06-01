import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function OnboardingModal({ open, onClose, personalityName = 'Ember', workflowComplete = false, }) {
    if (!open)
        return null;
    return (_jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": "DevShell onboarding", style: {
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'color-mix(in srgb, var(--ds-elevated) 96%, transparent)',
            backdropFilter: 'blur(6px)',
            animation: 'cactai-slide-down 220ms ease-out',
            overflow: 'auto', padding: '36px 44px',
        }, children: [_jsx("button", { onClick: onClose, "aria-label": "Close onboarding", style: {
                    position: 'absolute', top: 14, right: 18,
                    background: 'transparent', border: 'none', color: 'var(--ds-text-2)',
                    cursor: 'pointer', fontSize: 18,
                }, children: "\u00D7" }), _jsxs("div", { style: { maxWidth: 640, color: 'var(--ds-text)', fontSize: 14, lineHeight: 1.65 }, children: [_jsx("h2", { style: { fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 12 }, children: "Welcome to DevShell" }), _jsxs("ol", { style: { paddingLeft: 22, marginTop: 8 }, children: [_jsx("li", { style: { marginBottom: 12 }, children: "The first step is to describe your app idea in a few sentences. Use the example to help you structure your description; don't worry if you don't have all the details figured out yet. Start simple: \u201CI want to build a workout assistant\u201D or \u201CI want to build a marketplace.\u201D" }), _jsxs("li", { style: { marginBottom: 12 }, children: [_jsx("strong", { children: personalityName }), " will work with you to collect the information and make decisions. Once enough information is gathered, ", _jsx("strong", { children: personalityName }), " will build your app's core structure. Then you can use the ", _jsx("strong", { children: "Configuration" }), ' ', "page (the rail gear icon), the ", _jsx("strong", { children: "directory tree" }), " for manual code edits, and continue chatting with", ' ', _jsx("strong", { children: personalityName }), " to refine and expand. Use the", ' ', _jsx("strong", { children: "Plan" }), " button in the header for notes and the deferred backlog."] }), _jsxs("li", { style: { marginBottom: 12 }, children: ["After ", _jsx("strong", { children: personalityName }), " builds your app's core structure, you can test-drive your app using the", ' ', _jsx("strong", { children: "Test Drive" }), " button in the header."] })] }), workflowComplete && (_jsxs(_Fragment, { children: [_jsx("h3", { style: { fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 8 }, children: "Your app's core is built. To make it live:" }), _jsxs("ol", { style: { paddingLeft: 22, marginTop: 8 }, children: [_jsx("li", { children: "Open your project repo on GitHub." }), _jsxs("li", { children: ["Open a pull request comparing ", _jsx("code", { children: "dev" }), " \u2192 ", _jsx("code", { children: "main" }), "."] }), _jsx("li", { children: "Merge the PR (squash or merge \u2014 both fine)." }), _jsxs("li", { children: ["Vercel auto-deploys ", _jsx("code", { children: "main" }), " to your production URL."] })] }), _jsx("p", { style: { marginTop: 16 }, children: "To manage your app (users, payments, audit log), open this project's page on the Cactai dashboard and click \u201COpen Manage \u2192\u201D." }), _jsxs("p", { style: {
                                    marginTop: 16, padding: 12,
                                    border: '1px solid var(--c-warning, #FFB44D)',
                                    borderRadius: 6,
                                    background: 'color-mix(in srgb, var(--c-warning, #FFB44D) 12%, transparent)',
                                    fontSize: 13,
                                }, children: [_jsx("strong", { children: "***WARNING***" }), _jsx("br", {}), "Do NOT delete the ", _jsx("code", { children: "dev" }), " branch after merging. Cactai uses", _jsx("code", { children: " dev" }), " for every code change; removing it will stop this tool from working until the branch is restored. GitHub will offer to delete the source branch after merge \u2014 decline that prompt."] })] }))] })] }));
}
//# sourceMappingURL=OnboardingModal.js.map