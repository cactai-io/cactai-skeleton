'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/BYOKSection.tsx
// v1.2 Thread 08 — BYOK toggle + per-provider key write surface.
//
// Renders the current BYOK state, a toggle to swap between BYOK and
// Cactai-supplied keys, and a per-provider list with masked values plus
// Update/Set affordances. Mirrors the existing credentials section's
// editing pattern (input field with Save/Cancel) so the developer's
// muscle memory carries over.
//
// All saves use loading indicators; on failure the row reverts.
import { useState } from 'react';
const DEFAULT_PROVIDERS = [
    { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-…' },
    { id: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
    { id: 'github', label: 'GitHub', placeholder: 'ghp_…' },
    { id: 'vercel', label: 'Vercel', placeholder: 'vercel_…' },
    { id: 'supabase', label: 'Supabase', placeholder: 'https://xxx.supabase.co' },
    { id: 'stripe', label: 'Stripe', placeholder: 'sk_live_…' },
];
export function BYOKSection({ response, onPatch, providers = DEFAULT_PROVIDERS }) {
    const [toggleSaving, setToggleSaving] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [editingVal, setEditingVal] = useState('');
    const [rowSaving, setRowSaving] = useState({});
    const [rowError, setRowError] = useState({});
    async function toggleBYOK() {
        setToggleSaving(true);
        try {
            await onPatch({ enabled: !response.enabled });
        }
        finally {
            setToggleSaving(false);
        }
    }
    async function saveProvider(id) {
        setRowSaving((s) => ({ ...s, [id]: true }));
        setRowError((s) => { const next = { ...s }; delete next[id]; return next; });
        try {
            await onPatch({ set_provider: { id, value: editingVal.trim() } });
            setEditingKey(null);
            setEditingVal('');
        }
        catch (err) {
            setRowError((s) => ({ ...s, [id]: err instanceof Error ? err.message : 'save failed' }));
        }
        finally {
            setRowSaving((s) => { const next = { ...s }; delete next[id]; return next; });
        }
    }
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "BYOK" }), _jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 12.5, fontWeight: 500, color: 'var(--ds-text)' }, children: response.enabled ? 'Using your own provider API keys' : 'Using Cactai-supplied keys' }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11, marginTop: 4 }, children: response.enabled
                                        ? 'Calls bill to your provider accounts. Keys below are stored encrypted on your own Supabase.'
                                        : 'Calls bill to your Cactai plan. Switch on to provide your own keys per provider.' })] }), _jsxs("label", { className: "ds-toggle", title: response.enabled ? 'Switch to Cactai-supplied' : 'Switch to BYOK', children: [_jsx("input", { type: "checkbox", checked: response.enabled, disabled: toggleSaving, onChange: toggleBYOK }), _jsx("span", { className: "ds-toggle-track" }), _jsx("span", { className: "ds-toggle-thumb" })] })] }) }), response.enabled && providers.map((p) => {
                const rec = response.providers[p.id];
                const saving = !!rowSaving[p.id];
                const error = rowError[p.id];
                const editing = editingKey === p.id;
                return (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 500, color: 'var(--ds-text)', marginBottom: 3 }, children: p.label }), editing ? (_jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("input", { type: "password", value: editingVal, onChange: (e) => setEditingVal(e.target.value), placeholder: p.placeholder, autoFocus: true, style: {
                                                    flex: 1,
                                                    background: 'var(--ds-canvas)',
                                                    border: '1px solid var(--ds-border)',
                                                    borderRadius: 'var(--ds-r-sm)',
                                                    padding: '4px 8px',
                                                    color: 'var(--ds-text)',
                                                    fontSize: 12,
                                                    fontFamily: 'var(--f-mono)',
                                                    outline: 'none',
                                                }, onKeyDown: (e) => {
                                                    if (e.key === 'Enter')
                                                        saveProvider(p.id);
                                                    if (e.key === 'Escape') {
                                                        setEditingKey(null);
                                                        setEditingVal('');
                                                    }
                                                } }), _jsx("button", { className: "ds-btn-primary", onClick: () => saveProvider(p.id), disabled: saving, style: { fontSize: 11, padding: '4px 10px' }, children: saving ? '…' : 'Save' }), _jsx("button", { className: "ds-btn-ghost", onClick: () => { setEditingKey(null); setEditingVal(''); }, disabled: saving, style: { fontSize: 11, padding: '4px 8px' }, children: "\u2715" })] })) : (_jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-text-3)', fontFamily: 'var(--f-mono)' }, children: rec?.masked || 'Not set' })), error && (_jsx("div", { style: { fontSize: 11, color: 'var(--ds-danger, #E33)', marginTop: 4 }, children: error }))] }), !editing && (_jsx("button", { className: "ds-btn-ghost", onClick: () => { setEditingKey(p.id); setEditingVal(''); }, style: { fontSize: 11, padding: '4px 10px', flexShrink: 0 }, children: rec ? 'Update' : 'Set' }))] }) }, p.id));
            })] }));
}
//# sourceMappingURL=BYOKSection.js.map