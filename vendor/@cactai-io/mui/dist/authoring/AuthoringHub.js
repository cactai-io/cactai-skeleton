'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/authoring/AuthoringHub.tsx
//
// The "Studio" rail page — the single canonical home for the built-in
// authoring tools (tool / skill / agent / personality / character).
//
// Locked 2026-06-02: authoring tools are NOT anchored in the Library.
// They live on their own rail section that behaves like every other rail
// page (the main content area is the tool's workspace). The launchers that
// sit where a tool's output is used (e.g. the Config Tools/Skills tabs)
// don't open the tool inline — they navigate to this page and open the
// requested tool here.
//
// The active tool is owned by the DevShell shell (so an external launcher
// can deep-link to a specific tool); this component is controlled:
//   activeType === null  → the picker grid
//   activeType set       → that tool's AuthoringInterface
import { AuthoringInterface } from './AuthoringInterface.js';
const AUTHOR_TYPES = [
    { key: 'tool', label: 'Tool', blurb: 'A capability your app can call — an API action, computation, or integration.' },
    { key: 'skill', label: 'Skill', blurb: 'A packaged behaviour the agent can invoke, with its own renderer and inputs.' },
    { key: 'agent', label: 'Agent', blurb: 'A purpose-built worker — upload one or author it here with its own brief.' },
    { key: 'personality', label: 'Personality', blurb: 'How the assistant writes back: tone, structure, and level of detail.' },
    { key: 'character', label: 'Character', blurb: 'A named persona the app can present — its identity, style, and traits.' },
];
export function AuthoringHub({ activeType, onSelectType, onBack }) {
    if (activeType) {
        return (_jsx("div", { className: "ds-panel", children: _jsx(AuthoringInterface, { type: activeType, onCancel: onBack }) }));
    }
    return (_jsx("div", { className: "ds-panel", children: _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Studio" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 10 }, children: "Author the building blocks of your app. Pick what to create \u2014 you can also launch any of these from where their output is used." }), _jsx("div", { style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
                        gap: 8,
                    }, children: AUTHOR_TYPES.map(t => (_jsxs("button", { className: "ds-card", onClick: () => onSelectType(t.key), style: {
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            padding: 12,
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: t.label }), _jsx("span", { style: { fontSize: 11.5, color: 'var(--ds-text-3)' }, children: "+ Create" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', lineHeight: 1.45 }, children: t.blurb })] }, t.key))) })] }) }));
}
//# sourceMappingURL=AuthoringHub.js.map