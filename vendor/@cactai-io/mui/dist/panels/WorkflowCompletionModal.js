import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function WorkflowCompletionModal({ open, onClose, githubRepoUrl, productionUrl, }) {
    if (!open)
        return null;
    const githubCompareUrl = githubRepoUrl ? `${githubRepoUrl}/compare/main...dev` : undefined;
    return (_jsx("div", { role: "dialog", "aria-modal": "true", "aria-label": "Workflow complete", onClick: onClose, style: {
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: {
                background: 'var(--ds-elevated)',
                color: 'var(--ds-text)',
                border: '1px solid var(--ds-border)',
                borderRadius: 12,
                padding: 24,
                maxWidth: 560,
                width: '100%',
                lineHeight: 1.6,
                fontSize: 14,
            }, children: [_jsx("h2", { style: { fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 12 }, children: "\uD83C\uDF89 Your app's core is built." }), _jsx("p", { style: { marginTop: 8 }, children: "To make your app live on the production URL:" }), _jsxs("ol", { style: { paddingLeft: 22 }, children: [_jsx("li", { children: "Open your project repo on GitHub." }), _jsxs("li", { children: ["Open a pull request comparing ", _jsx("code", { children: "dev" }), " \u2192 ", _jsx("code", { children: "main" }), "."] }), _jsxs("li", { children: ["Merge ", _jsx("code", { children: "dev" }), " into ", _jsx("code", { children: "main" }), " (squash or merge \u2014 both fine)."] }), _jsxs("li", { children: ["Vercel auto-deploys ", _jsx("code", { children: "main" }), " to the production URL."] })] }), _jsx("p", { children: "To use your app as a user: open your production URL and sign up with whatever email/Google account you want. If your app uses auto-promotion on tenant creation, the first signup in each new tenant becomes the highest-rank tenant role automatically." }), _jsx("p", { children: "To manage your app (suspend users, reset passwords, view audit log): open this project's page on the Cactai dashboard and click \u201COpen Manage \u2192\u201D. The Manage panel is accessible to anyone with collaborator access to this project on Cactai." }), _jsxs("div", { style: {
                        marginTop: 16, padding: 12,
                        border: '1px solid var(--c-warning, #FFB44D)',
                        borderRadius: 6,
                        background: 'color-mix(in srgb, var(--c-warning, #FFB44D) 12%, transparent)',
                        fontSize: 13,
                    }, children: [_jsx("strong", { children: "***WARNING***" }), _jsx("br", {}), "Do NOT delete the ", _jsx("code", { children: "dev" }), " branch after merging. Cactai uses the ", _jsx("code", { children: "dev" }), " branch for every code change; removing it will stop this tool from working until the branch is restored. GitHub will offer to delete the source branch after merge \u2014 decline that prompt."] }), _jsxs("div", { style: {
                        marginTop: 20,
                        display: 'flex', gap: 8, flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                    }, children: [githubCompareUrl && (_jsx("a", { href: githubCompareUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: {
                                padding: '8px 14px',
                                fontSize: 13,
                                textDecoration: 'none',
                                color: 'var(--ds-text)',
                                border: '1px solid var(--ds-border)',
                                borderRadius: 6,
                            }, children: "Open GitHub \u2192" })), productionUrl && (_jsx("a", { href: productionUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: {
                                padding: '8px 14px',
                                fontSize: 13,
                                textDecoration: 'none',
                                color: 'var(--ds-text)',
                                border: '1px solid var(--ds-border)',
                                borderRadius: 6,
                            }, children: "Open my app \u2192" })), _jsx("button", { onClick: onClose, style: {
                                padding: '8px 14px',
                                fontSize: 13,
                                background: 'var(--ds-grad-135, var(--c-accent, #5fb6ff))',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                            }, children: "Dismiss" })] })] }) }));
}
//# sourceMappingURL=WorkflowCompletionModal.js.map