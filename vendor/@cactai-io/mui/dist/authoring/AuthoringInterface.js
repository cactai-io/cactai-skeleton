import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/authoring/AuthoringInterface.tsx
//
// Reusable authoring interface for the artifacts a developer can create:
// tools, skills, agents, personalities, characters. (Themes have their own
// dedicated editor — the ThemeInspector.) Each interface is a well-designed,
// functional FORM plus the shared 3-button AI-assist trio.
//
// The form fields work (controlled inputs). The three AI-assist buttons inject
// a STATIC, pre-authored prompt (one fixed string per type+action, see
// ASSIST_PROMPTS) into the agent chat via onAssist — the host wires it to
// shell.submitInput, the same visible-user-message mechanism the "Build my own"
// affordance already uses. The injected text never varies by form state or
// turn. The primary Save/Create action persists authored content and is wired
// in a later sprint.
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
const AI_ASSIST = [
    { key: 'start', label: 'Use AI to Get Started', sub: 'Build it from scratch with AI' },
    { key: 'assist', label: 'Get AI Assistance', sub: 'Continue what you started' },
    { key: 'analyze', label: 'Analyze with AI', sub: 'Check + fix what you have' },
];
// Static, pre-authored prompt assets — one fixed string per (type, action).
// Clicking an assist button injects exactly this text (the host wires it to
// shell.submitInput); it does NOT vary by form state or turn. Editing a prompt
// here is a one-line content change.
const ASSIST_PROMPTS = {
    tool: {
        start: 'I want to create a new tool for my app. Walk me through what it should do, then design its name, inputs, and behavior and scaffold it into the repo.',
        assist: 'Help me finish the tool I’m authoring. Ask me for anything you need, then complete its definition — name, inputs, and behavior — and wire it into the repo.',
        analyze: 'Review the tool I’m authoring for correctness, clear inputs, and good naming, and tell me what to fix before I add it.',
    },
    skill: {
        start: 'I want to create a new skill for my app. Walk me through what it should produce and the surface it renders, then scaffold it into the repo.',
        assist: 'Help me finish the skill I’m authoring — complete its inputs, behavior, and rendered surface, and wire it into the repo.',
        analyze: 'Review the skill I’m authoring for correctness, its inputs, and how it renders, and tell me what to fix.',
    },
    agent: {
        start: 'I want to add a new agent to my app. Help me define its responsibility, where it runs, and how it’s invoked, then scaffold it.',
        assist: 'Help me finish the agent I’m authoring — clarify its role, the tools it uses, and how it’s invoked, and wire it in.',
        analyze: 'Review the agent I’m authoring — its responsibility, boundaries, and how it’s invoked — and tell me what to fix.',
    },
    personality: {
        start: 'I want to create a new personality for my app — its tone, structure, and level of detail. Help me define it and add it.',
        assist: 'Help me finish the personality I’m authoring — refine its tone, the way it structures responses, and its level of detail.',
        analyze: 'Review the personality I’m authoring — tone, structure, and level of detail — and suggest improvements.',
    },
    character: {
        start: 'I want to create a new character for my app — a visual companion paired with a personality. Help me define its look and animation feel and add it.',
        assist: 'Help me finish the character I’m authoring — refine its base, look, and idle / thinking / responding animation feel.',
        analyze: 'Review the character I’m authoring — its look and animation feel — and suggest improvements.',
    },
};
export function AuthoringInterface({ type, onCancel, onAssist }) {
    const cfg = TYPES[type];
    const [values, setValues] = useState({});
    const set = (k, v) => setValues(prev => ({ ...prev, [k]: v }));
    return (_jsxs("div", { className: "ds-authoring", children: [_jsxs("div", { className: "ds-authoring-head", children: [_jsxs("div", { children: [_jsx("div", { className: "ds-authoring-title", children: cfg.title }), _jsx("div", { className: "ds-authoring-blurb", children: cfg.blurb })] }), onCancel && (_jsx("button", { type: "button", className: "ds-btn-ghost", onClick: onCancel, style: { fontSize: 11.5, padding: '4px 10px' }, children: "\u2715" }))] }), _jsx("div", { className: "ds-authoring-assist", children: AI_ASSIST.map(a => (_jsxs("button", { type: "button", className: "ds-authoring-assist-btn", disabled: !onAssist, onClick: () => onAssist?.(ASSIST_PROMPTS[type][a.key]), children: [_jsx("span", { className: "ds-authoring-assist-spark", "aria-hidden": true, children: "\u2726" }), _jsxs("span", { className: "ds-authoring-assist-text", children: [_jsx("span", { className: "ds-authoring-assist-label", children: a.label }), _jsx("span", { className: "ds-authoring-assist-sub", children: a.sub })] })] }, a.key))) }), _jsx("div", { className: "ds-authoring-or", children: _jsx("span", { children: "or build it yourself" }) }), cfg.upload && (_jsxs("label", { className: "ds-authoring-upload", children: [_jsx("input", { type: "file", style: { display: 'none' } }), _jsx("span", { className: "ds-authoring-upload-label", children: cfg.upload.label }), _jsx("span", { className: "ds-authoring-upload-hint", children: cfg.upload.hint })] })), _jsx("div", { className: "ds-authoring-form", children: cfg.fields.map(f => (_jsxs("div", { className: "ds-authoring-field", children: [_jsx("label", { className: "ds-authoring-field-label", htmlFor: `auth-${f.key}`, children: f.label }), f.kind === 'textarea' ? (_jsx("textarea", { id: `auth-${f.key}`, className: "ds-authoring-input", rows: 4, placeholder: f.placeholder, value: values[f.key] ?? '', onChange: e => set(f.key, e.target.value) })) : f.kind === 'select' ? (_jsxs("select", { id: `auth-${f.key}`, className: "ds-authoring-input", value: values[f.key] ?? '', onChange: e => set(f.key, e.target.value), children: [_jsx("option", { value: "", children: "Select\u2026" }), (f.options ?? []).map(o => _jsx("option", { value: o, children: o }, o))] })) : (_jsx("input", { id: `auth-${f.key}`, className: "ds-authoring-input", placeholder: f.placeholder, value: values[f.key] ?? '', onChange: e => set(f.key, e.target.value) })), f.hint && _jsx("div", { className: "ds-authoring-field-hint", children: f.hint })] }, f.key))) }), _jsx("div", { className: "ds-authoring-actions", children: _jsxs("button", { type: "button", className: "ds-btn-primary", "aria-disabled": "true", style: { fontSize: 12 }, children: ["Save ", type] }) })] }));
}
//# sourceMappingURL=AuthoringInterface.js.map