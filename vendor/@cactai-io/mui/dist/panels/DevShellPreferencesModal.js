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
import { useEffect, useState } from 'react';
import { CapabilityListPanel } from './CapabilityListPanel.js';
const RAIL_AUTOHIDE_KEY = 'cactai_devshell_rail_autohide';
const LANDING_KEY = 'cactai_devshell_landing';
const LANDING_OPTIONS = [
    { value: 'build', label: 'Build' },
    { value: 'plan', label: 'Plan' },
    { value: 'test_drive', label: 'Test Drive' },
    { value: 'last', label: 'Where I left off' },
];
export function DevShellPreferencesModal({ catalogue, config, onPatch, onClose }) {
    const [tab, setTab] = useState('capabilities');
    // Nav rail auto-hide. Stored as a developer-global preference (not
    // per-project) so the layout doesn't change when switching projects.
    // Broadcast a custom event so DevShell's React state picks up the
    // change without needing a remount.
    const [railAutoHide, setRailAutoHide] = useState(() => {
        if (typeof window === 'undefined')
            return false;
        return window.localStorage.getItem(RAIL_AUTOHIDE_KEY) === '1';
    });
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(RAIL_AUTOHIDE_KEY, railAutoHide ? '1' : '0');
        window.dispatchEvent(new CustomEvent('cactai:rail_autohide:change', {
            detail: { value: railAutoHide },
        }));
    }, [railAutoHide]);
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
                    }, children: [_jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: 'var(--ds-text)' }, children: "DevShell preferences" }), _jsx("button", { className: "ds-btn-ghost", onClick: onClose, "aria-label": "Close", style: { fontSize: 14, padding: '2px 8px' }, children: "\u2715" })] }), _jsxs("div", { style: { display: 'flex', gap: 4, padding: '8px 16px 0' }, children: [_jsx("button", { className: `ds-view-btn${tab === 'capabilities' ? ' ds-view-active' : ''}`, onClick: () => setTab('capabilities'), style: { fontSize: 11.5 }, children: "Tools & skills" }), _jsx("button", { className: `ds-view-btn${tab === 'layout' ? ' ds-view-active' : ''}`, onClick: () => setTab('layout'), style: { fontSize: 11.5 }, children: "Layout" }), _jsx("button", { className: `ds-view-btn${tab === 'theme_hint' ? ' ds-view-active' : ''}`, onClick: () => setTab('theme_hint'), style: { fontSize: 11.5 }, children: "Theme" })] }), _jsxs("div", { style: { overflow: 'auto', padding: '8px 16px 16px' }, children: [tab === 'capabilities' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Pick which tools and skills are available in the IDE for this project. These choices affect DevShell only \u2014 your deployed app's tools and skills are configured separately in Project settings." }), _jsx(CapabilityListPanel, { scope: "devshell", catalogue: catalogue, config: config, allowHide: false, onPatch: onPatch })] })), tab === 'layout' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-card", children: _jsx("div", { className: "ds-card-body", style: { fontSize: 12, lineHeight: 1.5 }, children: _jsxs("label", { style: {
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 10,
                                                cursor: 'pointer',
                                                padding: '4px 0',
                                            }, children: [_jsx("input", { type: "checkbox", checked: railAutoHide, onChange: (e) => setRailAutoHide(e.target.checked), style: { marginTop: 3, cursor: 'pointer' } }), _jsxs("span", { children: [_jsx("span", { style: { fontWeight: 500, color: 'var(--ds-text)' }, children: "Auto-hide the nav rail" }), _jsx("span", { style: { display: 'block', color: 'var(--ds-text-2)', marginTop: 2 }, children: "The left section rail collapses out of view. Mouse over the left edge of the screen to reveal it; it tucks back after you move away. The chat panel expands into the freed space when the rail is hidden." })] })] }) }) }), _jsx("div", { className: "ds-card", style: { marginTop: 8 }, children: _jsxs("div", { className: "ds-card-body", style: { fontSize: 12, lineHeight: 1.5 }, children: [_jsx("div", { style: { fontWeight: 500, color: 'var(--ds-text)', marginBottom: 6 }, children: "Startup view" }), _jsx("div", { style: { color: 'var(--ds-text-2)', marginBottom: 8 }, children: "Which page DevShell opens to when you enter this project. Applies the next time you open the IDE." }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: LANDING_OPTIONS.map(opt => (_jsx("button", { type: "button", className: `ds-view-btn${landing === opt.value ? ' ds-view-active' : ''}`, onClick: () => setLanding(opt.value), style: { fontSize: 11.5 }, children: opt.label }, opt.value))) })] }) })] })), tab === 'theme_hint' && (_jsx("div", { className: "ds-card", children: _jsx("div", { className: "ds-card-body", style: { fontSize: 12 }, children: "DevShell theme (light / dark / system) is in the avatar menu directly. It's per-developer, not per-project, so it lives on the Platform dashboard rather than here." }) }))] })] }) }));
}
//# sourceMappingURL=DevShellPreferencesModal.js.map