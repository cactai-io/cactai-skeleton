import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/DecisionLogPanel.tsx
// v1.4 — the decision log surface. Renders the stages → answered steps the
// wizard collected, each with its decision (selected option(s) or value) and
// the chat captured at that step. Fed by GET /v1/projects/:id/devshell/decision-log
// (assembled server-side in devshell/decision-log.ts).
//
//   variant 'active'  → compact live panel docked on the right during the wizard.
//   variant 'running' → full, scrollable view rendered in the Plan tab.
//
// Consumes theme via the shared --ds-* CSS custom properties (same as the other
// DevShell panels).
import { useState } from 'react';
function displayDecision(step) {
    if (step.options && step.options.length > 0) {
        const picked = step.options.filter(o => o.selected).map(o => o.label);
        if (picked.length > 0)
            return picked.join(', ');
    }
    const v = step.decision;
    if (v === true)
        return 'Yes';
    if (v === false)
        return 'No';
    if (Array.isArray(v))
        return v.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(', ');
    if (v && typeof v === 'object') {
        const o = v;
        if (typeof o.name === 'string')
            return o.name;
        return JSON.stringify(o);
    }
    return String(v ?? '');
}
export function DecisionLogPanel({ stages, variant = 'running', onRevise, flagged }) {
    const compact = variant === 'active';
    const flaggedSet = new Set(flagged ?? []);
    if (stages.length === 0) {
        return (_jsx("div", { style: { padding: 16, fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "Decisions you make will appear here as you go." }));
    }
    return (_jsxs("div", { style: { padding: compact ? 12 : 20, display: 'flex', flexDirection: 'column', gap: compact ? 10 : 16 }, children: [!compact && (_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: 'var(--ds-text)' }, children: "Decision log" })), stages.map(stage => (_jsxs("div", { children: [_jsx("div", { style: {
                            fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: 'var(--ds-text-3)', marginBottom: 8,
                        }, children: stage.stage }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: stage.steps.map(step => (_jsx(DecisionStepRow, { step: step, compact: compact, onRevise: onRevise, flagged: flaggedSet.has(step.step) }, step.step))) })] }, stage.stage)))] }));
}
function DecisionStepRow({ step, compact, onRevise, flagged }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const hasChat = step.chat.length > 0;
    const isMulti = Array.isArray(step.decision);
    const canEdit = Boolean(onRevise) && Boolean(step.options && step.options.length > 0);
    const [draft, setDraft] = useState(() => isMulti ? [...step.decision] : []);
    const pickSingle = async (value) => {
        if (!onRevise)
            return;
        setSaving(true);
        try {
            await onRevise(step.step, value);
            setEditing(false);
        }
        finally {
            setSaving(false);
        }
    };
    const saveMulti = async () => {
        if (!onRevise)
            return;
        setSaving(true);
        try {
            await onRevise(step.step, draft);
            setEditing(false);
        }
        finally {
            setSaving(false);
        }
    };
    const toggleDraft = (value) => setDraft(d => d.includes(value) ? d.filter(x => x !== value) : [...d, value]);
    return (_jsxs("div", { style: {
            background: 'var(--ds-surface, #13131F)',
            border: `1px solid ${flagged ? '#F5B544' : 'var(--ds-border, #25253A)'}`,
            borderRadius: 8,
            padding: compact ? '8px 10px' : '10px 12px',
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }, children: [_jsx("div", { style: { fontSize: compact ? 12 : 12.5, color: 'var(--ds-text-2)' }, children: step.question }), canEdit && !editing && (_jsx("button", { onClick: () => setEditing(true), style: { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                            color: 'var(--ds-accent, #5856E5)', fontSize: 11, fontFamily: 'inherit', flexShrink: 0 }, children: "Edit" }))] }), flagged && (_jsx("div", { style: { fontSize: 10.5, color: '#F5B544', marginTop: 2 }, children: "\u26A0 Revisit \u2014 an earlier change may have affected this." })), !editing && (_jsx("div", { style: { fontSize: compact ? 12.5 : 13, fontWeight: 600, color: 'var(--ds-text)', marginTop: 3 }, children: displayDecision(step) })), editing && step.options && (_jsxs("div", { style: { marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }, children: [step.options.map((o, i) => {
                        const active = isMulti ? draft.includes(o.value) : false;
                        return (_jsx("button", { disabled: saving, onClick: () => isMulti ? toggleDraft(o.value) : void pickSingle(o.value), style: {
                                padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: saving ? 'wait' : 'pointer',
                                fontFamily: 'inherit',
                                border: `1px solid ${active ? 'var(--ds-accent, #5856E5)' : 'var(--ds-border, #25253A)'}`,
                                background: active ? 'var(--ds-accent, #5856E5)' : 'transparent',
                                color: active ? '#fff' : 'var(--ds-text-2)',
                            }, children: o.label }, i));
                    }), isMulti && (_jsx("button", { onClick: () => void saveMulti(), disabled: saving, style: { padding: '4px 10px', fontSize: 12, borderRadius: 6, border: 'none',
                            background: 'var(--ds-accent, #5856E5)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }, children: "Save" })), _jsx("button", { onClick: () => setEditing(false), disabled: saving, style: { padding: '4px 10px', fontSize: 12, borderRadius: 6, border: 'none', background: 'transparent',
                            color: 'var(--ds-text-3)', cursor: 'pointer', fontFamily: 'inherit' }, children: "Cancel" })] })), hasChat && (_jsx("button", { onClick: () => setOpen(o => !o), style: {
                    marginTop: 6, background: 'transparent', border: 'none', padding: 0,
                    color: 'var(--ds-accent, #5856E5)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }, children: open ? 'Hide' : `Chat (${step.chat.length})` })), open && (_jsx("div", { style: { marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }, children: step.chat.map((c, i) => (_jsxs("div", { style: { fontSize: 11.5, lineHeight: 1.5 }, children: [_jsxs("div", { style: { color: 'var(--ds-text-2)' }, children: [_jsx("strong", { children: "You:" }), " ", c.dev] }), c.assistant && _jsxs("div", { style: { color: 'var(--ds-text-3)' }, children: [_jsx("strong", { children: "Ember:" }), " ", c.assistant] })] }, i))) }))] }));
}
export default DecisionLogPanel;
//# sourceMappingURL=DecisionLogPanel.js.map