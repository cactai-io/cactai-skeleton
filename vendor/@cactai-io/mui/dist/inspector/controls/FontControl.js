'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/inspector/controls/FontControl.tsx
//
// Font-family control. A curated dropdown of Cactai-known fonts plus an
// "Add custom font" affordance. The custom path collects a font name and
// expects the dev to drop a matching @font-face into their globals.css —
// the inspector cannot inject font files itself.
//
// Curated list includes the Cactai display + UI + chat + mono triad plus
// a small set of widely-used alternatives. Intentionally does NOT include
// Inter / Roboto / Arial — the frontend-design skill calls these out as
// generic-AI defaults to avoid.
import { useState } from 'react';
const CURATED_FONTS = [
    'Syne', // Cactai display
    'Geist Sans', // Cactai UI
    'Manrope', // Cactai chat
    'Fira Code', // Cactai mono
    'Source Serif 4', // marketing serif
    'JetBrains Mono',
    'IBM Plex Sans',
    'Inter Tight',
    'Helvetica',
    'system-ui',
];
export function FontControl({ path, value, locked, onChange, onAddCustomFont, }) {
    const [customMode, setCustomMode] = useState(false);
    const [custom, setCustom] = useState('');
    const familyOnly = value.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    const knownMatch = CURATED_FONTS.find(f => f.toLowerCase() === familyOnly.toLowerCase());
    return (_jsxs("div", { className: "ti-control-body", "data-locked": locked, children: [_jsx("div", { className: "ti-row", children: _jsxs("select", { className: "ti-input", value: knownMatch ?? '__custom__', onChange: e => {
                        if (e.target.value === '__custom__') {
                            setCustomMode(true);
                        }
                        else {
                            setCustomMode(false);
                            onChange(e.target.value);
                        }
                    }, disabled: locked, "aria-label": `${path} family`, children: [CURATED_FONTS.map(f => _jsx("option", { value: f, children: f }, f)), _jsx("option", { value: "__custom__", children: "Custom\u2026" })] }) }), customMode && (_jsxs("div", { className: "ti-row", children: [_jsx("input", { type: "text", className: "ti-input", placeholder: "Font family name (e.g. S\u00F6hne)", value: custom, onChange: e => setCustom(e.target.value), disabled: locked, spellCheck: false }), _jsx("button", { className: "ti-cancel", disabled: locked || !custom.trim(), onClick: () => {
                            const name = custom.trim();
                            onAddCustomFont?.(name);
                            onChange(name);
                            setCustomMode(false);
                            setCustom('');
                        }, children: "Apply" })] })), customMode && (_jsxs("p", { style: { fontSize: 11, color: 'var(--c-text-2)', margin: 0 }, children: ["Drop the matching ", _jsx("code", { children: "@font-face" }), " rule into ", _jsx("code", { children: "src/app/globals.css" }), " \u2014 the inspector can't fetch font files for you."] }))] }));
}
//# sourceMappingURL=FontControl.js.map