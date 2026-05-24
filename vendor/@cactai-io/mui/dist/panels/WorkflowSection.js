'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/panels/WorkflowSection.tsx
// v1.2 Thread 08 — workflow display + swap.
//
// Renders the currently active workflow and a "Switch workflow" button
// that opens an inline picker. Switching is substantial (it changes
// what steps the agent walks the developer through), so the swap is
// guarded by a confirmation modal.
//
// Per-step tool/skill assignment is out of scope for v1.2 — that's a
// v1.3 item. This panel only owns the selection-level swap.
import { useMemo, useState } from 'react';
export function WorkflowSection({ response, onPatch, marketplaceUrl }) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const active = useMemo(() => response.available.find((w) => w.id === response.active_id) ?? null, [response]);
    async function confirmSwap() {
        if (!confirming)
            return;
        setSaving(true);
        setError(null);
        try {
            await onPatch({ active_id: confirming });
            setConfirming(null);
            setPickerOpen(false);
            setSelected(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Workflow swap failed');
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Workflow" }), _jsxs("div", { className: "ds-card", children: [active ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card-title", style: { fontSize: 12.5 }, children: active.name }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: active.description }), _jsxs("div", { style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 4 }, children: ["Source: ", active.source === 'built_in' ? 'Built-in' : 'Dev-authored'] })] })) : (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No workflow assigned yet. Select one to begin guiding the agent through this project." })), _jsx("button", { className: "ds-btn-ghost", onClick: () => setPickerOpen((o) => !o), style: { fontSize: 11.5, marginTop: 8 }, children: pickerOpen ? 'Close picker' : (active ? 'Switch workflow' : 'Choose workflow') })] }), pickerOpen && (_jsxs("div", { style: { marginTop: 8 }, children: [response.available.length === 0 && (_jsx("div", { style: { fontSize: 12, color: 'var(--ds-text-3)' }, children: "No workflows available. Author one via the project library or browse the marketplace." })), response.available.map((w) => {
                        const isActive = w.id === response.active_id;
                        const isSelected = w.id === selected;
                        return (_jsxs("div", { className: "ds-card", role: "button", tabIndex: 0, onClick: () => setSelected(w.id), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ')
                                setSelected(w.id); }, style: {
                                cursor: 'pointer',
                                borderColor: isSelected ? 'var(--ds-accent, #6A4AE0)' : undefined,
                                borderWidth: isSelected ? 2 : undefined,
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: w.name }), isActive && _jsx("span", { className: "ds-badge ds-badge-active", children: "active" }), _jsx("span", { className: `ds-badge ${w.source === 'built_in' ? 'ds-badge-sdk' : 'ds-badge-dev'}`, children: w.source === 'built_in' ? 'built-in' : 'custom' })] }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: w.description })] }, w.id));
                    }), marketplaceUrl && (_jsx("a", { href: marketplaceUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, marginTop: 8, display: 'inline-block' }, children: "Browse marketplace \u2197" })), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { className: "ds-btn-primary", onClick: () => selected && selected !== response.active_id && setConfirming(selected), disabled: !selected || selected === response.active_id, style: { fontSize: 11.5 }, children: "Switch to selected" }), _jsx("button", { className: "ds-btn-ghost", onClick: () => { setPickerOpen(false); setSelected(null); }, style: { fontSize: 11.5 }, children: "Cancel" })] })] })), confirming && (_jsx(ConfirmModal, { message: `Switching workflow changes which steps the agent walks you through. Continue?`, saving: saving, error: error, onConfirm: confirmSwap, onCancel: () => { setConfirming(null); setError(null); } }))] }));
}
function ConfirmModal({ message, saving, error, onConfirm, onCancel }) {
    return (_jsx("div", { role: "dialog", "aria-modal": "true", style: {
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
        }, onClick: onCancel, children: _jsxs("div", { onClick: (e) => e.stopPropagation(), style: {
                background: 'var(--ds-elevated)',
                border: '1px solid var(--ds-border)',
                borderRadius: 'var(--ds-r-md)',
                padding: 20,
                maxWidth: 420,
                width: 'calc(100% - 32px)',
            }, children: [_jsx("div", { style: { fontSize: 13, color: 'var(--ds-text)', marginBottom: 12 }, children: message }), error && (_jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-danger, #E33)', marginBottom: 12 }, children: error })), _jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: [_jsx("button", { className: "ds-btn-ghost", onClick: onCancel, disabled: saving, style: { fontSize: 11.5 }, children: "Cancel" }), _jsx("button", { className: "ds-btn-primary", onClick: onConfirm, disabled: saving, style: { fontSize: 11.5 }, children: saving ? 'Switching…' : 'Confirm switch' })] })] }) }));
}
//# sourceMappingURL=WorkflowSection.js.map