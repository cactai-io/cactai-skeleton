'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useState } from 'react';
import { CapabilityListPanel } from './CapabilityListPanel.js';
export function DevShellPreferencesModal({ catalogue, config, onPatch, onClose }) {
    const [tab, setTab] = useState('capabilities');
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
                    }, children: [_jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: 'var(--ds-text)' }, children: "DevShell preferences" }), _jsx("button", { className: "ds-btn-ghost", onClick: onClose, "aria-label": "Close", style: { fontSize: 14, padding: '2px 8px' }, children: "\u2715" })] }), _jsxs("div", { style: { display: 'flex', gap: 4, padding: '8px 16px 0' }, children: [_jsx("button", { className: `ds-view-btn${tab === 'capabilities' ? ' ds-view-active' : ''}`, onClick: () => setTab('capabilities'), style: { fontSize: 11.5 }, children: "Tools & skills" }), _jsx("button", { className: `ds-view-btn${tab === 'theme_hint' ? ' ds-view-active' : ''}`, onClick: () => setTab('theme_hint'), style: { fontSize: 11.5 }, children: "Theme" })] }), _jsxs("div", { style: { overflow: 'auto', padding: '8px 16px 16px' }, children: [tab === 'capabilities' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Pick which tools and skills are available in the IDE for this project. These choices affect DevShell only \u2014 your deployed app's tools and skills are configured separately in Project settings." }), _jsx(CapabilityListPanel, { scope: "devshell", catalogue: catalogue, config: config, allowHide: false, onPatch: onPatch })] })), tab === 'theme_hint' && (_jsx("div", { className: "ds-card", children: _jsx("div", { className: "ds-card-body", style: { fontSize: 12 }, children: "DevShell theme (light / dark / system) is in the avatar menu directly. It's per-developer, not per-project, so it lives on the Platform dashboard rather than here." }) }))] })] }) }));
}
//# sourceMappingURL=DevShellPreferencesModal.js.map