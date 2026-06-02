'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/DevShellPreferencesModal.tsx
// v1.2 Thread 06 — Surface 2 of tool/skill availability config.
//
// Opens from the avatar menu's "DevShell preferences" entry. Wraps the
// same CapabilityListPanel that ProjectSettingsPanel uses, but in the
// devshell scope and with allowHide=false. The Thread 06 prompt is
// explicit: DevShell never has a "show hidden" affordance — developers
// always see what's available in the IDE.
//
// The avatar menu already has a "DevShell preferences" header (theme
// switcher etc.) in v1.1. The new entry lives below the theme buttons
// and opens this modal, leaving the existing theme controls in place.
import { useEffect, useState } from 'react';
import { CapabilityListPanel } from './CapabilityListPanel.js';
const LANDING_KEY = 'cactai_devshell_landing';
const LANDING_OPTIONS = [
    { value: 'build', label: 'Build' },
    { value: 'plan', label: 'Plan' },
    { value: 'test_drive', label: 'Test Drive' },
    { value: 'last', label: 'Where I left off' },
];
export function DevShellPreferencesModal({ catalogue, config, onPatch, onClose, variant = 'modal' }) {
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
            { key: 'ai', label: 'AI' },
            { key: 'integrations', label: 'Integrations' },
        ].map(t => (_jsx("button", { className: `ds-view-btn${tab === t.key ? ' ds-view-active' : ''}`, onClick: () => setTab(t.key), style: { fontSize: 11.5 }, children: t.label }, t.key))) }));
    const bodyInner = (_jsxs(_Fragment, { children: [tab === 'tools' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Which tools are available in the IDE for this project. Your deployed app's tools are configured separately in App Configuration." }), _jsx(CapabilityListPanel, { scope: "devshell", catalogue: catalogue, config: config, allowHide: false, onPatch: onPatch, only: "tool" })] })), tab === 'skills' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Which skills are available in the IDE for this project. Your deployed app's skills are configured separately in App Configuration." }), _jsx(CapabilityListPanel, { scope: "devshell", catalogue: catalogue, config: config, allowHide: false, onPatch: onPatch, only: "skill" })] })), tab === 'preferences' && (_jsx(_Fragment, { children: _jsx("div", { className: "ds-card", children: _jsxs("div", { className: "ds-card-body", style: { fontSize: 12, lineHeight: 1.5 }, children: [_jsx("div", { style: { fontWeight: 500, color: 'var(--ds-text)', marginBottom: 6 }, children: "Startup view" }), _jsx("div", { style: { color: 'var(--ds-text-2)', marginBottom: 8 }, children: "Which page DevShell opens to when you enter this project. Applies the next time you open the IDE." }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: LANDING_OPTIONS.map(opt => (_jsx("button", { type: "button", className: `ds-view-btn${landing === opt.value ? ' ds-view-active' : ''}`, onClick: () => setLanding(opt.value), style: { fontSize: 11.5 }, children: opt.label }, opt.value))) })] }) }) })), tab === 'ai' && (_jsx("div", { className: "ds-card", children: _jsx("div", { className: "ds-card-body", style: { fontSize: 12, lineHeight: 1.55, color: 'var(--ds-text-2)' }, children: "Your DevShell AI provider keys + per-provider budgets \u2014 the keys the IDE's agent uses while you build. Coming next; mirrors App Configuration's AI tab without the 3-state policy or Tiers (this scope is just you)." }) })), tab === 'integrations' && (_jsx("div", { className: "ds-card", children: _jsx("div", { className: "ds-card-body", style: { fontSize: 12, lineHeight: 1.55, color: 'var(--ds-text-2)' }, children: "Connect MCP servers the IDE's agent can use while you build. Coming next." }) }))] }));
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