'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/PersonalityPickerPanel.tsx
// v1.2 Thread 07 — personality picker.
//
// Renders all available personalities (built-ins + dev-authored) as
// selectable cards. Selection + Confirm swaps the project's active
// personality. The "Edit" affordance opens the editor for dev-authored
// personalities only — built-ins are read-only and surface a hint
// directing the developer to create a new personality based on the
// built-in.
//
// All saves use loading indicators; never optimistic. On failure the
// selection reverts.
import { useState } from 'react';
export function PersonalityPickerPanel({ active_id, available, onConfirm, onOpenEditor, onCreate, }) {
    const [selected, setSelected] = useState(active_id);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    async function confirm() {
        if (selected === active_id)
            return;
        setSaving(true);
        setError(null);
        try {
            await onConfirm({ active_id: selected });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to swap personality');
            setSelected(active_id);
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsx("div", { children: _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Personality" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Pick the voice your agent speaks in. Themes and personalities are independent \u2014 switching personality does not change your theme." }), available.map((p) => {
                    const isActive = active_id === p.id;
                    const isSelected = selected === p.id;
                    const isCustom = p.source === 'developer_authored';
                    return (_jsx("div", { className: "ds-card", role: "button", tabIndex: 0, onClick: () => setSelected(p.id), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ')
                            setSelected(p.id); }, style: {
                            cursor: 'pointer',
                            borderColor: isSelected ? 'var(--ds-accent, #6A4AE0)' : undefined,
                            borderWidth: isSelected ? 2 : undefined,
                        }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsx("input", { type: "radio", name: "personality-picker", checked: isSelected, onChange: () => setSelected(p.id), "aria-label": `Select ${p.display_name}`, style: { marginTop: 2 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 13 }, children: p.display_name }), isActive && _jsx("span", { className: "ds-badge ds-badge-active", children: "active" }), isCustom && _jsx("span", { className: "ds-badge ds-badge-dev", children: "custom" }), !isCustom && _jsx("span", { className: "ds-badge ds-badge-sdk", children: "built-in" })] }), _jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-text-3)', marginBottom: 4 }, children: p.description }), _jsxs("div", { style: { fontSize: 11.5, color: 'var(--ds-text)', fontStyle: 'italic' }, children: ["\u201C", p.sample_line, "\u201D"] })] }), isCustom && (_jsx("button", { className: "ds-btn-ghost", onClick: (e) => { e.stopPropagation(); onOpenEditor(p.id); }, style: { fontSize: 11, padding: '4px 10px', flexShrink: 0 }, children: "Edit" }))] }) }, p.id));
                }), onCreate && (_jsxs("div", { className: "ds-card", role: "button", tabIndex: 0, onClick: onCreate, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ')
                        onCreate(); }, style: {
                        cursor: 'pointer',
                        borderStyle: 'dashed',
                        textAlign: 'center',
                    }, children: [_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-2, var(--ds-text))' }, children: "+ Create new personality" }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', marginTop: 4 }, children: "Author one in chat. Appears here once saved." })] })), error && (_jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-danger, #E33)', marginTop: 6 }, children: error })), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { className: "ds-btn-primary", onClick: confirm, disabled: saving || selected === active_id, style: { fontSize: 11.5 }, children: saving ? 'Switching…' : 'Switch personality' }), selected !== active_id && (_jsx("button", { className: "ds-btn-ghost", onClick: () => setSelected(active_id), disabled: saving, style: { fontSize: 11.5 }, children: "Cancel" }))] })] }) }));
}
//# sourceMappingURL=PersonalityPickerPanel.js.map