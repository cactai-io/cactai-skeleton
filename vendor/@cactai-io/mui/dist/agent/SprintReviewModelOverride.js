// packages/mui/src/agent/SprintReviewModelOverride.tsx
// Sprint review per-task model override (v1.3 Phase 14, Gap 82). Shown
// inside Phase 15's sprint review panel for each planned task — the
// developer sees the task type label, the currently selected model
// (from settings), and a per-task dropdown to override for this sprint
// only.
//
// Per agent-sdk-model-selection-protocol.md "Sprint-level Override":
//   - Defaults to the developer's saved model selection for the task type
//   - Override applies to that sprint's dispatch only
//   - "Save as default for this task type" promotes the override to
//     the persistent setting
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AGENT_TASK_TYPE_LABELS, } from '@cactai-io/types';
export function SprintReviewModelOverride(props) {
    const { tasks, resolvedModelIds, onOverrideChange, onSaveAsDefault } = props;
    const [savingDefault, setSavingDefault] = useState(null);
    const handleSaveDefault = (task) => {
        if (!onSaveAsDefault)
            return;
        setSavingDefault(task.task_id);
        onSaveAsDefault(task.task_type, task.override_tier);
        setTimeout(() => setSavingDefault(null), 800);
    };
    return (_jsxs("div", { style: {
            fontFamily: 'var(--f-ui, system-ui)',
            color: 'var(--ds-text, #E8E8F0)',
            maxWidth: 720,
        }, children: [_jsx("h4", { style: {
                    margin: 0,
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: 'var(--ds-text-2, #A0A0B8)',
                }, children: "Per-task model overrides" }), _jsx("p", { style: {
                    margin: 0,
                    marginBottom: 12,
                    fontSize: 12,
                    color: 'var(--ds-text-3, #7A7A8E)',
                    lineHeight: 1.5,
                }, children: "Adjust the model for any task in this sprint. The override applies to this sprint's dispatch only \u2014 your settings stay unchanged unless you save the override as the new default for the task type." }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: tasks.map(task => {
                    const changed = task.override_tier !== task.current_tier;
                    return (_jsxs("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            gap: 12,
                            alignItems: 'center',
                            padding: '10px 12px',
                            background: 'var(--ds-surface-1, #15151F)',
                            border: `1px solid ${changed ? 'var(--ds-accent, #5856E5)' : 'var(--ds-border-1, #25253A)'}`,
                            borderRadius: 4,
                        }, children: [_jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: {
                                            fontSize: 13,
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }, children: task.task_summary ?? AGENT_TASK_TYPE_LABELS[task.task_type] }), _jsx("div", { style: {
                                            fontSize: 11,
                                            color: 'var(--ds-text-3, #7A7A8E)',
                                            marginTop: 2,
                                            fontFamily: 'var(--f-mono, monospace)',
                                        }, children: AGENT_TASK_TYPE_LABELS[task.task_type] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }, children: [_jsxs("select", { value: task.override_tier, onChange: e => onOverrideChange(task.task_id, e.target.value), style: {
                                            background: 'var(--ds-surface-2, rgba(255,255,255,0.02))',
                                            color: 'var(--ds-text, #E8E8F0)',
                                            border: '1px solid var(--ds-border-2, #25253A)',
                                            borderRadius: 4,
                                            padding: '3px 6px',
                                            fontSize: 12,
                                            fontFamily: 'inherit',
                                            cursor: 'pointer',
                                        }, children: [_jsx("option", { value: "haiku", children: "Haiku" }), _jsx("option", { value: "sonnet", children: "Sonnet" }), _jsx("option", { value: "opus", children: "Opus" })] }), _jsx("div", { style: {
                                            fontSize: 10,
                                            color: 'var(--ds-text-3, #7A7A8E)',
                                            fontFamily: 'var(--f-mono, monospace)',
                                        }, children: resolvedModelIds[task.override_tier] })] }), changed && onSaveAsDefault && (_jsx("button", { type: "button", onClick: () => handleSaveDefault(task), disabled: savingDefault === task.task_id, style: {
                                    background: 'transparent',
                                    border: '1px solid var(--ds-border-2, #25253A)',
                                    color: 'var(--ds-text-2, #A0A0B8)',
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    cursor: savingDefault === task.task_id ? 'wait' : 'pointer',
                                    fontFamily: 'inherit',
                                    whiteSpace: 'nowrap',
                                }, title: `Promote ${task.override_tier} to the saved default for ${AGENT_TASK_TYPE_LABELS[task.task_type]}`, children: savingDefault === task.task_id ? 'Saved' : 'Save as default' }))] }, task.task_id));
                }) })] }));
}
//# sourceMappingURL=SprintReviewModelOverride.js.map