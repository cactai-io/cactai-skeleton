// packages/mui/src/agent/ComplexityEscalationPrompt.tsx
// Database complexity escalation prompt (v1.3 Phase 14, Gap 83). Surfaced
// in DevShell chat when the AgentDispatcher's pre-dispatch complexity
// check trips (Phase 4's checkMigrationComplexity → escalate=true). The
// developer picks between Opus and Sonnet; the dispatcher's
// resolveEscalation callback continues the dispatch with the chosen tier.
//
// Per agent-sdk-model-selection-protocol.md "Database Complexity Check
// Implementation":
//
//   "This schema has complex RLS dependencies. Opus would handle it more
//    reliably. Run with Opus for this migration?"
//   [Use Opus for this migration]  [Continue with Sonnet]
//
// The complexity_escalation progress event from the dispatcher carries
// `reasons: string[]` — the five threshold trips that fired. We show
// the first 2-3 as bullets so the developer sees why escalation was
// suggested.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function ComplexityEscalationPrompt(props) {
    const { reasons, onResolve, onAbort } = props;
    const [submitting, setSubmitting] = useState(null);
    const pick = (choice) => {
        setSubmitting(choice);
        onResolve(choice);
        // Keep the button in "Saving" state until the host unmounts the
        // prompt; if it stays mounted for some reason, fall back after 2s.
        setTimeout(() => setSubmitting(null), 2000);
    };
    return (_jsxs("div", { role: "dialog", "aria-label": "Complexity check \u2014 pick a model tier", style: {
            fontFamily: 'var(--f-ui, system-ui)',
            color: 'var(--ds-text, #E8E8F0)',
            background: 'var(--ds-surface-1, #15151F)',
            border: '1px solid var(--ds-accent, #5856E5)',
            borderRadius: 8,
            padding: 16,
            maxWidth: 560,
        }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                }, children: [_jsx("span", { "aria-hidden": true, style: { fontSize: 16 }, children: "\u26A0\uFE0F" }), _jsx("h4", { style: {
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 600,
                        }, children: "This schema has complex RLS dependencies" })] }), _jsx("p", { style: {
                    margin: 0,
                    marginBottom: 10,
                    fontSize: 13,
                    color: 'var(--ds-text-2, #A0A0B8)',
                    lineHeight: 1.5,
                }, children: "Opus would handle it more reliably. You can run this migration at Opus tier just for this dispatch, or proceed with your configured default (Sonnet) and accept the higher risk of policy bugs." }), reasons.length > 0 && (_jsxs("ul", { style: {
                    margin: 0,
                    marginBottom: 14,
                    paddingLeft: 18,
                    fontSize: 12,
                    color: 'var(--ds-text-3, #7A7A8E)',
                    lineHeight: 1.5,
                }, children: [reasons.slice(0, 3).map((r, i) => (_jsx("li", { style: { marginBottom: 3 }, children: r }, i))), reasons.length > 3 && (_jsxs("li", { style: { fontStyle: 'italic', opacity: 0.7 }, children: ["+ ", reasons.length - 3, " more threshold", reasons.length - 3 === 1 ? '' : 's', " tripped"] }))] })), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { onClick: () => pick('opus'), disabled: submitting !== null, style: {
                            background: 'var(--ds-accent, #5856E5)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 14px',
                            borderRadius: 4,
                            cursor: submitting !== null ? 'wait' : 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            fontFamily: 'inherit',
                        }, children: submitting === 'opus' ? 'Switching…' : 'Use Opus for this migration' }), _jsx("button", { onClick: () => pick('sonnet'), disabled: submitting !== null, style: {
                            background: 'transparent',
                            border: '1px solid var(--ds-border-2, #25253A)',
                            color: 'var(--ds-text-2, #A0A0B8)',
                            padding: '8px 14px',
                            borderRadius: 4,
                            cursor: submitting !== null ? 'wait' : 'pointer',
                            fontSize: 13,
                            fontFamily: 'inherit',
                        }, children: submitting === 'sonnet' ? 'Continuing…' : 'Continue with Sonnet' }), onAbort && (_jsx("button", { onClick: onAbort, disabled: submitting !== null, style: {
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ds-text-3, #7A7A8E)',
                            padding: '8px 12px',
                            fontSize: 12,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            textDecoration: 'underline',
                        }, children: "Abort dispatch" }))] })] }));
}
//# sourceMappingURL=ComplexityEscalationPrompt.js.map