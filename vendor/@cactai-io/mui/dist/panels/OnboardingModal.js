import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function OnboardingModal({ open, onClose, personalityName = 'Ember', workflowComplete = false, }) {
    if (!open)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @keyframes cactai-onboarding-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      ` }), _jsxs("div", { role: "dialog", "aria-modal": "false", "aria-label": "DevShell onboarding", style: {
                    // Occupies the chat panel slot (positioned by the host inside
                    // the main flex container). Width is intrinsic to the column.
                    position: 'absolute',
                    inset: 0,
                    zIndex: 50,
                    background: 'var(--ds-surface)',
                    borderRight: '1px solid var(--ds-border-soft, rgba(255,255,255,0.06))',
                    color: 'var(--ds-text)',
                    animation: 'cactai-onboarding-slide-down 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--ds-border-soft, rgba(255,255,255,0.06))',
                            flexShrink: 0,
                        }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ds-text-3)' }, children: "DevShell guide" }), _jsx("button", { onClick: onClose, "aria-label": "Close guide", title: "Close guide", style: {
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--ds-text-2)',
                                    cursor: 'pointer',
                                    fontSize: 16,
                                    lineHeight: 1,
                                    padding: '2px 6px',
                                }, children: "\u2303" })] }), _jsxs("div", { style: { padding: '20px 24px', flex: 1, fontSize: 14, lineHeight: 1.65 }, children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 12 }, children: "Welcome to DevShell" }), _jsxs("ol", { style: { paddingLeft: 22, marginTop: 8 }, children: [_jsx("li", { style: { marginBottom: 12 }, children: "The first step is to describe your app idea in a few sentences. Use the example to help you structure your description; don't worry if you don't have all the details figured out yet. Start simple: \u201CI want to build a workout assistant\u201D or \u201CI want to build a marketplace.\u201D" }), _jsxs("li", { style: { marginBottom: 12 }, children: [_jsx("strong", { children: personalityName }), " will work with you to collect the information and make decisions. Once enough information is gathered, ", _jsx("strong", { children: personalityName }), " will build your app's core structure. Then you can use the ", _jsx("strong", { children: "Configuration" }), ' ', "page (the rail gear icon), the ", _jsx("strong", { children: "directory tree" }), " for manual code edits, and continue chatting with", ' ', _jsx("strong", { children: personalityName }), " to refine and expand. Use the", ' ', _jsx("strong", { children: "Plan" }), " button in the header for notes and the deferred backlog."] }), _jsxs("li", { style: { marginBottom: 12 }, children: ["After ", _jsx("strong", { children: personalityName }), " builds your app's core structure, you can test-drive your app using the", ' ', _jsx("strong", { children: "Test Drive" }), " button in the header."] })] }), workflowComplete && (_jsxs(_Fragment, { children: [_jsx("h3", { style: { fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 8 }, children: "Your app's core is built. To make it live:" }), _jsxs("ol", { style: { paddingLeft: 22, marginTop: 8 }, children: [_jsx("li", { children: "Open your project repo on GitHub." }), _jsxs("li", { children: ["Open a pull request comparing ", _jsx("code", { children: "dev" }), " \u2192 ", _jsx("code", { children: "main" }), "."] }), _jsx("li", { children: "Merge the PR (squash or merge \u2014 both fine)." }), _jsxs("li", { children: ["Vercel auto-deploys ", _jsx("code", { children: "main" }), " to your production URL."] })] }), _jsxs("p", { style: { marginTop: 16 }, children: ["To manage your app (users, payments, audit log), open this project's page on the Cactai dashboard and click ", _jsx("strong", { children: "Manage" }), "."] }), _jsxs("p", { style: {
                                            marginTop: 16, padding: 12,
                                            border: '1px solid var(--c-warning, #FFB44D)',
                                            borderRadius: 6,
                                            background: 'color-mix(in srgb, var(--c-warning, #FFB44D) 12%, transparent)',
                                            fontSize: 13,
                                        }, children: [_jsx("strong", { children: "***WARNING***" }), _jsx("br", {}), "Do NOT delete the ", _jsx("code", { children: "dev" }), " branch after merging. Cactai uses", _jsx("code", { children: " dev" }), " for every code change; removing it will stop this tool from working until the branch is restored. GitHub will offer to delete the source branch after merge \u2014 decline that prompt."] })] }))] })] })] }));
}
//# sourceMappingURL=OnboardingModal.js.map