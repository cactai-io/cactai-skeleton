// packages/mui/src/agent/ModelSelectionPanel.tsx
// AI Model Selection settings panel (v1.3 Phase 14, Gap 81). Renders one
// row per Agent SDK task type with a Haiku / Sonnet / Opus dropdown +
// the resolved current model ID + per-row admin-only toggle (management
// shell version) + reset-to-defaults / apply buttons.
//
// Per agent-sdk-integration-revisions.md Revision 5:
//
//   [Task type label]                 [Model tier dropdown ▾]
//   [One-line task type description]  [Current model ID, muted text]
//
// Used in two locations:
//   1. DevShell settings panel — developer-facing customization
//   2. Management shell AI Configuration card — for the developer's own
//      app. Two top-level toggles control end-user visibility +
//      end-user write access; per-row admin-only toggles hide
//      individual rows from user-role users.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AGENT_TASK_TYPE_LABELS, AGENT_TASK_TYPE_DESCRIPTIONS, } from '@cactai-io/types';
// Platform defaults — duplicated here from @cactai-io/core/agent-sdk so
// the panel doesn't pull a server dep. Kept in sync by hand; the
// orchestrator's dispatcher is the canonical source.
export const PANEL_DEFAULT_SELECTIONS = {
    file_reading: 'haiku',
    discrete_file_change: 'haiku',
    component_page_generation: 'sonnet',
    api_route_handler_generation: 'sonnet',
    database_schema: 'sonnet',
    tool_skill_authoring: 'sonnet',
    ui_design_styling: 'sonnet',
    code_review: 'sonnet',
    refactoring: 'sonnet',
    legal_content_generation: 'sonnet',
    complex_multi_file_feature: 'sonnet',
    // v1.3.5 — spec-first test authoring runs against acceptance criteria,
    // not the generated code. Sonnet is sufficient for vitest/RTL authoring
    // at the unit level.
    test_authoring: 'sonnet',
};
const TASK_TYPE_ORDER = [
    'file_reading',
    'discrete_file_change',
    'component_page_generation',
    'api_route_handler_generation',
    'database_schema',
    'tool_skill_authoring',
    'ui_design_styling',
    'code_review',
    'refactoring',
    'legal_content_generation',
    'complex_multi_file_feature',
];
const ZONE_INTRO = `Defaults are set to balance cost and quality. Change any task to a higher tier if you need better output, or lower if you want to reduce cost.`;
export function ModelSelectionPanel(props) {
    const { selections, resolvedModelIds, onChange, manageMode = false, endUserVisible = true, endUserEditable = false, adminOnly = {}, onManageChange, onRemoveFromManage, } = props;
    const [saving, setSaving] = useState(false);
    const setRow = (type, tier) => {
        onChange({ ...selections, [type]: tier });
    };
    const resetAll = () => {
        onChange({ ...PANEL_DEFAULT_SELECTIONS });
    };
    const applyAll = () => {
        setSaving(true);
        setTimeout(() => setSaving(false), 600);
        // The host's onChange callback already persists each row; the
        // "Apply changes" button is mostly an affordance + confirmation.
    };
    const setAdminOnly = (type, value) => {
        if (!onManageChange)
            return;
        onManageChange({ adminOnly: { ...adminOnly, [type]: value } });
    };
    return (_jsxs("div", { style: {
            fontFamily: 'var(--f-ui, system-ui)',
            color: 'var(--ds-text, #E8E8F0)',
            maxWidth: 760,
        }, children: [_jsx("h3", { style: {
                    margin: 0,
                    marginBottom: 8,
                    fontSize: 16,
                    fontWeight: 600,
                }, children: "AI Model Selection" }), _jsx("p", { style: {
                    margin: 0,
                    marginBottom: 16,
                    fontSize: 13,
                    color: 'var(--ds-text-2, #A0A0B8)',
                    lineHeight: 1.5,
                }, children: ZONE_INTRO }), manageMode && (_jsx("div", { style: {
                    background: 'var(--ds-surface-2, rgba(255,255,255,0.02))',
                    border: '1px solid var(--ds-border-1, #25253A)',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 16,
                }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: endUserVisible, onChange: e => onManageChange?.({ endUserVisible: e.target.checked }) }), _jsx("span", { children: "Show this section to end users" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', opacity: endUserVisible ? 1 : 0.5 }, children: [_jsx("input", { type: "checkbox", checked: endUserEditable, onChange: e => onManageChange?.({ endUserEditable: e.target.checked }), disabled: !endUserVisible }), _jsx("span", { children: "Allow end users to change model selections" })] })] }) })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: TASK_TYPE_ORDER.map(taskType => {
                    const tier = selections[taskType] ?? PANEL_DEFAULT_SELECTIONS[taskType];
                    const label = AGENT_TASK_TYPE_LABELS[taskType];
                    const desc = AGENT_TASK_TYPE_DESCRIPTIONS[taskType];
                    const isAdminOnly = adminOnly[taskType] === true;
                    return (_jsxs("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: manageMode ? '1fr auto auto' : '1fr auto',
                            gap: 16,
                            alignItems: 'center',
                            padding: '12px 14px',
                            background: 'var(--ds-surface-1, #15151F)',
                            border: '1px solid var(--ds-border-1, #25253A)',
                            borderRadius: 6,
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: label }), _jsx("div", { style: { fontSize: 12, color: 'var(--ds-text-2, #A0A0B8)', marginTop: 2 }, children: desc })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }, children: [_jsxs("select", { value: tier, onChange: e => setRow(taskType, e.target.value), style: {
                                            background: 'var(--ds-surface-2, rgba(255,255,255,0.02))',
                                            color: 'var(--ds-text, #E8E8F0)',
                                            border: '1px solid var(--ds-border-2, #25253A)',
                                            borderRadius: 4,
                                            padding: '4px 8px',
                                            fontSize: 13,
                                            fontFamily: 'inherit',
                                            cursor: 'pointer',
                                        }, children: [_jsx("option", { value: "haiku", children: "Haiku" }), _jsx("option", { value: "sonnet", children: "Sonnet" }), _jsx("option", { value: "opus", children: "Opus" })] }), _jsx("div", { style: {
                                            fontSize: 11,
                                            color: 'var(--ds-text-3, #7A7A8E)',
                                            fontFamily: 'var(--f-mono, monospace)',
                                        }, children: resolvedModelIds[tier] })] }), manageMode && (_jsx("button", { type: "button", onClick: () => setAdminOnly(taskType, !isAdminOnly), title: isAdminOnly ? 'Click to allow end users' : 'Click to hide from end users', "aria-pressed": isAdminOnly, style: {
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    color: isAdminOnly ? 'var(--ds-accent, #5856E5)' : 'var(--ds-text-3, #7A7A8E)',
                                    padding: 4,
                                }, children: isAdminOnly ? '🔒' : '👁' }))] }, taskType));
                }) }), _jsxs("div", { style: { marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("button", { onClick: resetAll, style: {
                            background: 'transparent',
                            border: '1px solid var(--ds-border-2, #25253A)',
                            color: 'var(--ds-text-2, #A0A0B8)',
                            padding: '8px 14px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontFamily: 'inherit',
                        }, children: "Reset all to defaults" }), _jsx("button", { onClick: applyAll, disabled: saving, style: {
                            background: 'var(--ds-accent, #5856E5)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: 4,
                            cursor: saving ? 'wait' : 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            fontFamily: 'inherit',
                        }, children: saving ? 'Applied' : 'Apply changes' }), manageMode && onRemoveFromManage && (_jsx("button", { onClick: onRemoveFromManage, style: {
                            marginLeft: 'auto',
                            background: 'transparent',
                            border: '1px solid var(--ds-border-2, #25253A)',
                            color: 'var(--ds-error, #E33)',
                            padding: '8px 14px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontFamily: 'inherit',
                        }, children: "Remove this section from the management shell" }))] })] }));
}
//# sourceMappingURL=ModelSelectionPanel.js.map