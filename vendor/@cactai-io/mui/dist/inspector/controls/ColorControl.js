'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/inspector/controls/ColorControl.tsx
//
// Color token control. Renders:
//   - A swatch that doubles as the native color picker affordance.
//   - A hex/string input for direct typing.
//   - A "copy from another token" dropdown when other color tokens are
//     available in the same theme (useful for setting accent === primary).
//
// Accepts any string value — hex (#RRGGBB / #RRGGBBAA), rgb()/rgba(), hsl(),
// or a CSS var() reference. Validation is lenient on purpose; the dev's
// theme.ts ultimately decides whether the value compiles.
import { useId } from 'react';
export function ColorControl({ path, value, locked, onChange, siblings = [], }) {
    const inputId = useId();
    const isHexish = /^#[0-9A-Fa-f]{3,8}$/.test(value);
    return (_jsxs("div", { className: "ti-control-body", "data-locked": locked, children: [_jsxs("div", { className: "ti-row", children: [_jsx("label", { className: "ti-color-swatch", style: { background: value }, "aria-label": `${path} swatch`, children: _jsx("input", { type: "color", value: isHexish ? hexToSixDigit(value) : '#000000', onChange: e => onChange(e.target.value), disabled: locked, "aria-labelledby": inputId }) }), _jsx("input", { id: inputId, type: "text", className: "ti-input", value: value, onChange: e => onChange(e.target.value), spellCheck: false, disabled: locked })] }), siblings.length > 0 && (_jsx("div", { className: "ti-row", children: _jsxs("select", { className: "ti-input", value: "", onChange: e => {
                        if (e.target.value)
                            onChange(e.target.value);
                        e.target.value = '';
                    }, disabled: locked, "aria-label": `Copy ${path} from another color token`, children: [_jsx("option", { value: "", children: "Copy from\u2026" }), siblings
                            .filter(s => s.path !== path)
                            .map(s => (_jsxs("option", { value: s.value, children: [s.path, " \u2192 ", s.value] }, s.path)))] }) }))] }));
}
function hexToSixDigit(hex) {
    // Normalize #RGB / #RGBA / #RRGGBBAA to #RRGGBB for the native picker
    // (which only accepts six-digit form).
    const m = /^#([0-9A-Fa-f]+)$/.exec(hex);
    if (!m)
        return '#000000';
    const h = m[1];
    if (h.length === 3)
        return '#' + h.split('').map(c => c + c).join('');
    if (h.length === 4)
        return '#' + h.slice(0, 3).split('').map(c => c + c).join('');
    if (h.length === 6)
        return '#' + h;
    if (h.length === 8)
        return '#' + h.slice(0, 6);
    return '#000000';
}
//# sourceMappingURL=ColorControl.js.map