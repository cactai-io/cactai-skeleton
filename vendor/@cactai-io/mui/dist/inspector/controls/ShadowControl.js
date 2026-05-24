'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/inspector/controls/ShadowControl.tsx
//
// Box-shadow token control. Decomposes a single-layer CSS shadow into its
// component parts (offset-x, offset-y, blur, spread, color) and lets the
// dev edit each independently. The color sub-field delegates to
// ColorControl.
//
// Multi-layer shadows (comma-separated lists like elev-2's two-layer
// stack) are detected and shown read-only with a small note — editing a
// multi-layer shadow in a structured form is a separate UI we haven't
// designed for v1.1. Direct text edits are still possible via the raw
// input row.
import { useEffect, useState } from 'react';
import { ColorControl } from './ColorControl.js';
export function ShadowControl({ path, value, locked, onChange, }) {
    const multiLayer = value.split(/,(?![^()]*\))/).length > 1;
    const [parts, setParts] = useState(() => multiLayer ? null : parseShadow(value));
    useEffect(() => {
        setParts(multiLayer ? null : parseShadow(value));
    }, [value, multiLayer]);
    function commit(next) {
        setParts(next);
        onChange(`${next.ox}px ${next.oy}px ${next.blur}px ${next.spread}px ${next.color}`);
    }
    return (_jsxs("div", { className: "ti-control-body", "data-locked": locked, children: [_jsx("div", { className: "ti-row", children: _jsx("input", { type: "text", className: "ti-input", value: value, onChange: e => onChange(e.target.value), disabled: locked, spellCheck: false, "aria-label": `${path} raw value` }) }), parts && !multiLayer && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ti-shadow-grid", children: [_jsxs("div", { className: "ti-shadow-cell", children: [_jsx("label", { children: "Offset X" }), _jsx("input", { type: "number", className: "ti-input", value: parts.ox, onChange: e => commit({ ...parts, ox: Number(e.target.value) }), disabled: locked })] }), _jsxs("div", { className: "ti-shadow-cell", children: [_jsx("label", { children: "Offset Y" }), _jsx("input", { type: "number", className: "ti-input", value: parts.oy, onChange: e => commit({ ...parts, oy: Number(e.target.value) }), disabled: locked })] }), _jsxs("div", { className: "ti-shadow-cell", children: [_jsx("label", { children: "Blur" }), _jsx("input", { type: "number", className: "ti-input", value: parts.blur, min: 0, onChange: e => commit({ ...parts, blur: Number(e.target.value) }), disabled: locked })] }), _jsxs("div", { className: "ti-shadow-cell", children: [_jsx("label", { children: "Spread" }), _jsx("input", { type: "number", className: "ti-input", value: parts.spread, onChange: e => commit({ ...parts, spread: Number(e.target.value) }), disabled: locked })] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 10.5, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }, children: "Color" }), _jsx(ColorControl, { path: `${path}.color`, value: parts.color, locked: locked, onChange: c => commit({ ...parts, color: c }) })] })] })), multiLayer && (_jsx("p", { style: { fontSize: 11, color: 'var(--c-text-2)', margin: 0 }, children: "Multi-layer shadow \u2014 edit as raw value above, or split into single layers in the file directly." })), _jsx("div", { className: "ti-shadow-preview", style: { boxShadow: value } })] }));
}
function parseShadow(input) {
    // Strip leading inset / spread keyword; v1.1 supports only outer shadows.
    const s = input.trim();
    // Pull color first (anything that starts with #, rgb(, rgba(, hsl(, hsla(,
    // a CSS named color, or var(...))
    const colorMatch = s.match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|var\([^)]+\)|#[0-9A-Fa-f]{3,8}|[a-zA-Z]+)\s*$/);
    if (!colorMatch)
        return null;
    const color = colorMatch[1];
    const lengths = s.slice(0, colorMatch.index).trim().split(/\s+/);
    if (lengths.length < 2)
        return null;
    const px = (raw) => raw ? parseFloat(raw.replace('px', '')) : 0;
    return {
        ox: px(lengths[0]),
        oy: px(lengths[1]),
        blur: px(lengths[2]),
        spread: px(lengths[3]),
        color,
    };
}
//# sourceMappingURL=ShadowControl.js.map