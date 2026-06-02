import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/authoring/AuthoringInterface.tsx
//
// Reusable authoring interface for the artifacts a developer can create:
// tools, skills, agents, personalities, characters. (Themes have their own
// dedicated editor — the ThemeInspector.) Each interface is a well-designed,
// functional FORM plus the shared 3-button AI-assist trio.
//
// SCOPE (2026-06-02): UI/UX ONLY. The three AI-assist buttons are intentionally
// DEAD here — the per-type system prompts + chat-injection wiring are a separate
// sprint (every such system prompt must be evaluated + its wiring reviewed for
// end-to-end testing). The form fields work (controlled inputs); the primary
// Save/Create action and the AI buttons are not wired yet.
//
// See memory: authoring-ai-assist.md.
import { useState } from 'react';
const TYPES = {
    tool: {
        title: 'New tool',
        blurb: 'Define a tool your app or its agent can call — its name, what it does, and the inputs it takes.',
        fields: [
            { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. send_email' },
            { key: 'domain', label: 'Domain', kind: 'text', placeholder: 'e.g. communication' },
            { key: 'description', label: 'Description', kind: 'textarea', placeholder: 'What the tool does and when the agent should use it.' },
            { key: 'inputs', label: 'Inputs', kind: 'textarea', placeholder: 'List the parameters the tool accepts.', hint: 'One per line: name — type — description.' },
        ],
    },
    skill: {
        title: 'New skill',
        blurb: 'Author a skill — a reusable capability with a rendered surface. Describe what it produces and the inputs it needs.',
        fields: [
            { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. summarize_thread' },
            { key: 'domain', label: 'Domain', kind: 'text', placeholder: 'e.g. productivity' },
            { key: 'description', label: 'Description', kind: 'textarea', placeholder: 'What the skill does and the surface it renders.' },
            { key: 'inputs', label: 'Inputs', kind: 'textarea', placeholder: 'The inputs the skill needs to run.' },
        ],
    },
    agent: {
        title: 'New agent',
        blurb: 'Add an agent — either upload an existing agent file and specify how + where it is used, or build one with AI assistance.',
        fields: [
            { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. onboarding_concierge' },
            { key: 'use', label: 'Use', kind: 'textarea', placeholder: 'What this agent is responsible for.' },
            { key: 'location', label: 'Location', kind: 'text', placeholder: 'Where this agent runs / is invoked.' },
        ],
        upload: { label: 'Upload agent file', hint: 'Drop an agent definition file, or click to browse.' },
    },
    personality: {
        title: 'New personality',
        blurb: 'Author a personality — the text-chat interaction style (tone, structure, level of detail) your app speaks with.',
        fields: [
            { key: 'display_name', label: 'Display name', kind: 'text', placeholder: 'e.g. Ember' },
            { key: 'tone', label: 'Tone', kind: 'text', placeholder: 'e.g. warm, thoughtful, slightly playful' },
            { key: 'description', label: 'Description', kind: 'textarea', placeholder: 'How this personality structures responses and the level of detail it gives.' },
        ],
    },
    character: {
        title: 'New character',
        blurb: 'Author a character — the animated visual companion paired with a personality.',
        fields: [
            { key: 'name', label: 'Name', kind: 'text', placeholder: 'e.g. Owl' },
            { key: 'base', label: 'Base', kind: 'select', options: ['Owl', 'Robot', 'Prairie Dog', 'Custom'] },
            { key: 'description', label: 'Description', kind: 'textarea', placeholder: 'The character’s look + idle/thinking/responding animation feel.' },
        ],
    },
};
// The shared AI-assist trio. DEAD for now (no wiring) — see scope note above.
const AI_ASSIST = [
    { key: 'start', label: 'Use AI to Get Started', sub: 'Build it from scratch with AI' },
    { key: 'assist', label: 'Get AI Assistance', sub: 'Continue what you started' },
    { key: 'analyze', label: 'Analyze with AI', sub: 'Check + fix what you have' },
];
export function AuthoringInterface({ type, onCancel }) {
    const cfg = TYPES[type];
    const [values, setValues] = useState({});
    const set = (k, v) => setValues(prev => ({ ...prev, [k]: v }));
    return (_jsxs("div", { className: "ds-authoring", children: [_jsxs("div", { className: "ds-authoring-head", children: [_jsxs("div", { children: [_jsx("div", { className: "ds-authoring-title", children: cfg.title }), _jsx("div", { className: "ds-authoring-blurb", children: cfg.blurb })] }), onCancel && (_jsx("button", { type: "button", className: "ds-btn-ghost", onClick: onCancel, style: { fontSize: 11.5, padding: '4px 10px' }, children: "\u2715" }))] }), _jsx("div", { className: "ds-authoring-assist", children: AI_ASSIST.map(a => (_jsxs("button", { type: "button", className: "ds-authoring-assist-btn", "aria-disabled": "true", children: [_jsx("span", { className: "ds-authoring-assist-spark", "aria-hidden": true, children: "\u2726" }), _jsxs("span", { className: "ds-authoring-assist-text", children: [_jsx("span", { className: "ds-authoring-assist-label", children: a.label }), _jsx("span", { className: "ds-authoring-assist-sub", children: a.sub })] })] }, a.key))) }), _jsx("div", { className: "ds-authoring-or", children: _jsx("span", { children: "or build it yourself" }) }), cfg.upload && (_jsxs("label", { className: "ds-authoring-upload", children: [_jsx("input", { type: "file", style: { display: 'none' } }), _jsx("span", { className: "ds-authoring-upload-label", children: cfg.upload.label }), _jsx("span", { className: "ds-authoring-upload-hint", children: cfg.upload.hint })] })), _jsx("div", { className: "ds-authoring-form", children: cfg.fields.map(f => (_jsxs("div", { className: "ds-authoring-field", children: [_jsx("label", { className: "ds-authoring-field-label", htmlFor: `auth-${f.key}`, children: f.label }), f.kind === 'textarea' ? (_jsx("textarea", { id: `auth-${f.key}`, className: "ds-authoring-input", rows: 4, placeholder: f.placeholder, value: values[f.key] ?? '', onChange: e => set(f.key, e.target.value) })) : f.kind === 'select' ? (_jsxs("select", { id: `auth-${f.key}`, className: "ds-authoring-input", value: values[f.key] ?? '', onChange: e => set(f.key, e.target.value), children: [_jsx("option", { value: "", children: "Select\u2026" }), (f.options ?? []).map(o => _jsx("option", { value: o, children: o }, o))] })) : (_jsx("input", { id: `auth-${f.key}`, className: "ds-authoring-input", placeholder: f.placeholder, value: values[f.key] ?? '', onChange: e => set(f.key, e.target.value) })), f.hint && _jsx("div", { className: "ds-authoring-field-hint", children: f.hint })] }, f.key))) }), _jsx("div", { className: "ds-authoring-actions", children: _jsxs("button", { type: "button", className: "ds-btn-primary", "aria-disabled": "true", style: { fontSize: 12 }, children: ["Save ", type] }) })] }));
}
//# sourceMappingURL=AuthoringInterface.js.map