'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/panels/DevShellPreferencesModal.tsx
// v1.2 Thread 06 — Surface 2 of tool/skill availability config.
//
// Opens from the avatar menu's "DevShell preferences" entry. Wraps the
// same CapabilityListPanel that AppConfigurationPanel uses, but in the
// devshell scope and with allowHide=false. The Thread 06 prompt is
// explicit: DevShell never has a "show hidden" affordance — developers
// always see what's available in the IDE.
//
// The avatar menu already has a "DevShell preferences" header (theme
// switcher etc.) in v1.1. The new entry lives below the theme buttons
// and opens this modal, leaving the existing theme controls in place.
import { useEffect, useState, useMemo } from 'react';
import { CapabilityListPanel } from './CapabilityListPanel.js';
import { groupAIProviders, CATEGORY_LABEL, BUDGET_UNIT } from './aiProviders.js';
import { MCPManager } from './MCPManager.js';
const LANDING_KEY = 'cactai_devshell_landing';
const LANDING_OPTIONS = [
    { value: 'build', label: 'Build' },
    { value: 'plan', label: 'Plan' },
    { value: 'test_drive', label: 'Test Drive' },
    { value: 'last', label: 'Where I left off' },
];
// DevShell Configuration → AI. Mirrors App Configuration's AI tab MINUS the
// 3-state policy + Tiers — this scope is just the developer. Framework-first:
// the same real provider catalogue with per-provider key + budget. Key
// storage + budget persistence wire from SelfDrivenDevShell (devshell BYOK
// scope) with the functional build.
const DS_INPUT = {
    background: 'var(--ds-canvas)', border: '1px solid var(--ds-border)',
    borderRadius: 'var(--ds-r-sm)', padding: '4px 8px', color: 'var(--ds-text)',
    fontSize: 11.5, fontFamily: 'var(--f-mono)', outline: 'none',
};
function DevShellAITab({ byok, onBYOKPatch }) {
    const grouped = useMemo(() => groupAIProviders(), []);
    const [budget, setBudget] = useState({});
    const [editing, setEditing] = useState(null);
    const [editVal, setEditVal] = useState('');
    const [saving, setSaving] = useState(null);
    const save = async (id) => {
        if (!onBYOKPatch)
            return;
        setSaving(id);
        try {
            await onBYOKPatch({ set_provider: { id, value: editVal.trim() } });
            setEditing(null);
            setEditVal('');
        }
        finally {
            setSaving(null);
        }
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 10, color: 'var(--ds-text-2)', lineHeight: 1.5 }, children: "Your DevShell provider keys \u2014 the keys the IDE's agent uses while you build (Anthropic / OpenAI were collected in the wizard). Just you: no Included/BYOK policy or Tiers. Stored encrypted on your own Supabase." }), grouped.map(group => (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--ds-text-2)', margin: '4px 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: CATEGORY_LABEL[group.category] ?? group.category }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: group.providers.map(p => {
                            const rec = byok?.providers?.[p.id];
                            const isEditing = editing === p.id;
                            return (_jsxs("div", { className: "ds-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12, flex: 1, minWidth: 120 }, children: p.name }), isEditing ? (_jsxs("div", { style: { display: 'flex', gap: 6, flex: 1, minWidth: 200 }, children: [_jsx("input", { type: "password", value: editVal, autoFocus: true, onChange: e => setEditVal(e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                                                            void save(p.id); if (e.key === 'Escape') {
                                                            setEditing(null);
                                                            setEditVal('');
                                                        } }, placeholder: "API key\u2026", style: { ...DS_INPUT, flex: 1 } }), _jsx("button", { className: "ds-btn-primary", onClick: () => void save(p.id), disabled: saving === p.id, style: { fontSize: 11, padding: '3px 10px' }, children: saving === p.id ? '…' : 'Save' }), _jsx("button", { className: "ds-btn-ghost", onClick: () => { setEditing(null); setEditVal(''); }, style: { fontSize: 11, padding: '3px 8px' }, children: "\u2715" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { style: { fontSize: 11, color: rec ? 'var(--ds-text-2)' : 'var(--ds-text-3)', fontFamily: 'var(--f-mono)' }, children: rec?.masked || 'Not set' }), onBYOKPatch && (_jsx("button", { className: "ds-btn-ghost", onClick: () => { setEditing(p.id); setEditVal(''); }, style: { fontSize: 11, padding: '3px 10px' }, children: rec ? 'Update' : 'Set key' }))] }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: "Budget" }), _jsx("input", { type: "number", min: 0, value: budget[p.id] ?? '', onChange: e => setBudget(prev => ({ ...prev, [p.id]: e.target.value })), placeholder: "0", style: { ...DS_INPUT, width: 110 } }), _jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: BUDGET_UNIT[group.category] ?? 'units / mo' })] })] }, p.id));
                        }) })] }, group.category))), _jsx("div", { className: "ds-card-body", style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 4 }, children: "Budgets are framework-first (not yet persisted). Key changes save immediately to your app's encrypted store." })] }));
}
// DevShell Configuration → Integrations. The IDE-scope MCP servers (separate
// from the app's Integrations). Framework-first add form; the connected-server
// list + enable/disable wire from SelfDrivenDevShell (devshell MCP scope).
function DevShellIntegrationsTab({ mcp }) {
    // Live MCP manager when the host wired the devshell-scope MCP data;
    // otherwise the framework-first add form (pre-wiring / data still loading).
    if (mcp) {
        return (_jsx(MCPManager, { title: "DevShell integrations (MCP)", explainer: mcp.explainer, catalog: mcp.catalog, servers: mcp.servers, loading: mcp.loading ?? false, onAdd: mcp.onAdd, onRemove: mcp.onRemove, onToggle: mcp.onToggle }));
    }
    return (_jsxs("div", { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 10, color: 'var(--ds-text-2)', lineHeight: 1.5 }, children: "Connect MCP servers the IDE's agent can use while you build. DevShell scope \u2014 these are yours, separate from your app's Integrations." }), _jsxs("div", { className: "ds-card", children: [_jsx("div", { className: "ds-card-title", style: { fontSize: 12, marginBottom: 6 }, children: "Add MCP server" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("input", { placeholder: "Label (e.g. GitHub)", style: { ...DS_INPUT, fontFamily: 'var(--f-ui)' }, disabled: true }), _jsx("input", { placeholder: "SSE endpoint URL", style: DS_INPUT, disabled: true }), _jsx("button", { className: "ds-btn-primary", disabled: true, style: { fontSize: 11.5, padding: '5px 12px', alignSelf: 'flex-start' }, children: "Connect" })] })] }), _jsx("div", { className: "ds-card-body", style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 8 }, children: "Loading devshell MCP\u2026" })] }));
}
export function DevShellPreferencesModal({ catalogue, config, onPatch, onClose, variant = 'modal', mcp, byok, onBYOKPatch }) {
    // DevShell Configuration 5-tab layout (locked spec). Preferences holds the
    // theme hint + layout (rail auto-hide) + startup view. Tools/Skills are the
    // devshell-scope capability lists (split). AI + Integrations are scoped here
    // pending their devshell-scope data wiring (provider keys + budgets; MCP).
    const [tab, setTab] = useState('preferences');
    // (Nav-rail auto-hide moved to the avatar menu, beside the theme toggle.)
    // Startup view — which page DevShell opens to. Global preference; 'last'
    // resumes the per-project last-active view. Applied at DevShell mount (no
    // live effect needed) so the change takes effect next time the IDE opens.
    const [landing, setLanding] = useState(() => {
        if (typeof window === 'undefined')
            return 'build';
        const v = window.localStorage.getItem(LANDING_KEY);
        return (v === 'plan' || v === 'build' || v === 'test_drive' || v === 'last') ? v : 'build';
    });
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(LANDING_KEY, landing);
    }, [landing]);
    const tabBar = (_jsx("div", { style: { display: 'flex', gap: 4, padding: '8px 16px 0', flexWrap: 'wrap' }, children: [
            { key: 'preferences', label: 'Preferences' },
            { key: 'tools', label: 'Tools' },
            { key: 'skills', label: 'Skills' },
            { key: 'ai', label: 'Providers' },
            { key: 'integrations', label: 'Integrations' },
        ].map(t => (_jsx("button", { className: `ds-view-btn${tab === t.key ? ' ds-view-active' : ''}`, onClick: () => setTab(t.key), style: { fontSize: 11.5 }, children: t.label }, t.key))) }));
    const bodyInner = (_jsxs(_Fragment, { children: [tab === 'tools' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Which tools are available in the IDE for this project. Your deployed app's tools are configured separately in App Configuration." }), _jsx(CapabilityListPanel, { scope: "devshell", catalogue: catalogue, config: config, allowHide: false, onPatch: onPatch, only: "tool" })] })), tab === 'skills' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Which skills are available in the IDE for this project. Your deployed app's skills are configured separately in App Configuration." }), _jsx(CapabilityListPanel, { scope: "devshell", catalogue: catalogue, config: config, allowHide: false, onPatch: onPatch, only: "skill" })] })), tab === 'preferences' && (_jsx(_Fragment, { children: _jsx("div", { className: "ds-card", children: _jsxs("div", { className: "ds-card-body", style: { fontSize: 12, lineHeight: 1.5 }, children: [_jsx("div", { style: { fontWeight: 500, color: 'var(--ds-text)', marginBottom: 6 }, children: "Startup view" }), _jsx("div", { style: { color: 'var(--ds-text-2)', marginBottom: 8 }, children: "Which page DevShell opens to when you enter this project. Applies the next time you open the IDE." }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: LANDING_OPTIONS.map(opt => (_jsx("button", { type: "button", className: `ds-view-btn${landing === opt.value ? ' ds-view-active' : ''}`, onClick: () => setLanding(opt.value), style: { fontSize: 11.5 }, children: opt.label }, opt.value))) })] }) }) })), tab === 'ai' && _jsx(DevShellAITab, { byok: byok, onBYOKPatch: onBYOKPatch }), tab === 'integrations' && _jsx(DevShellIntegrationsTab, { mcp: mcp })] }));
    // Full-page variant — fills the DevShell workspace content area. No
    // overlay/backdrop; a header row with a Back affordance returns to the
    // last active IDE view.
    if (variant === 'page') {
        return (_jsxs("div", { role: "region", "aria-label": "DevShell Configuration", style: {
                flex: 1, minHeight: 0,
                display: 'flex', flexDirection: 'column',
                background: 'var(--ds-elevated)',
            }, children: [_jsxs("div", { style: {
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderBottom: '1px solid var(--ds-border)',
                    }, children: [_jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: 'var(--ds-text)' }, children: "DevShell Configuration" }), _jsx("button", { className: "ds-btn-ghost", onClick: onClose, "aria-label": "Back to workspace", style: { fontSize: 11.5, padding: '2px 10px' }, children: "\u2190 Back" })] }), tabBar, _jsx("div", { style: { flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 16px 16px' }, children: bodyInner })] }));
    }
    return (_jsx("div", { role: "dialog", "aria-modal": "true", "aria-label": "DevShell preferences", style: {
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
        }, onClick: onClose, children: _jsxs("div", { onClick: (e) => e.stopPropagation(), style: {
                background: 'var(--ds-elevated)',
                border: '1px solid var(--ds-border)',
                borderRadius: 'var(--ds-r-md)',
                padding: 0,
                maxWidth: 560,
                width: 'calc(100% - 32px)',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
            }, children: [_jsxs("div", { style: {
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderBottom: '1px solid var(--ds-border)',
                    }, children: [_jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: 'var(--ds-text)' }, children: "DevShell preferences" }), _jsx("button", { className: "ds-btn-ghost", onClick: onClose, "aria-label": "Close", style: { fontSize: 14, padding: '2px 8px' }, children: "\u2715" })] }), tabBar, _jsx("div", { style: { overflow: 'auto', padding: '8px 16px 16px' }, children: bodyInner })] }) }));
}
//# sourceMappingURL=DevShellPreferencesModal.js.map