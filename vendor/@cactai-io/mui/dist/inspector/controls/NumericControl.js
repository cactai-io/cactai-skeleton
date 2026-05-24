'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/inspector/controls/NumericControl.tsx
//
// Numeric token control. Slider + numeric input + unit toggle.
//
// Values come in as either raw numbers (treated as px) or CSS-length strings
// like "16px", "1rem", "0.5em". The control parses on read and serializes
// on change, preserving the unit selection. Sliders cap at sensible bounds
// — 0..96 for px, 0..6 for rem/em — but the typed input has no upper bound.
import { useEffect, useState } from 'react';
export function NumericControl({ path, value, locked, onChange, min, max, }) {
    const initial = parseValue(value);
    const [unit, setUnit] = useState(initial.unit);
    const [num, setNum] = useState(initial.num);
    useEffect(() => {
        // Re-sync from prop when the parent rewinds (e.g. cancel-and-reopen)
        const parsed = parseValue(value);
        setUnit(parsed.unit);
        setNum(parsed.num);
    }, [value]);
    const sliderMin = min ?? 0;
    const sliderMax = max ?? (unit === 'px' ? 96 : 6);
    const step = unit === 'px' ? 1 : 0.125;
    function commit(nextNum, nextUnit) {
        setNum(nextNum);
        setUnit(nextUnit);
        onChange(`${formatNum(nextNum)}${nextUnit}`);
    }
    return (_jsxs("div", { className: "ti-control-body", "data-locked": locked, children: [_jsx("div", { className: "ti-row", children: _jsx("input", { type: "range", className: "ti-slider", min: sliderMin, max: sliderMax, step: step, value: Math.min(num, sliderMax), onChange: e => commit(Number(e.target.value), unit), disabled: locked, "aria-label": `${path} value` }) }), _jsxs("div", { className: "ti-row", children: [_jsx("input", { type: "number", className: "ti-input", value: num, step: step, onChange: e => commit(Number(e.target.value), unit), disabled: locked, "aria-label": `${path} numeric value` }), _jsx("div", { className: "ti-unit-toggle", role: "radiogroup", "aria-label": "Unit", children: ['px', 'rem', 'em'].map(u => (_jsx("button", { role: "radio", "aria-checked": unit === u, "data-active": unit === u, onClick: () => commit(num, u), disabled: locked, children: u }, u))) })] })] }));
}
function parseValue(value) {
    if (typeof value === 'number')
        return { num: value, unit: 'px' };
    const m = /^([-+]?\d*\.?\d+)(px|rem|em)?$/i.exec(value.trim());
    if (!m)
        return { num: 0, unit: 'px' };
    const num = parseFloat(m[1]);
    const unit = m[2]?.toLowerCase() ?? 'px';
    return { num, unit };
}
function formatNum(n) {
    // Drop trailing zeros, keep up to 3 decimals.
    return Number(n.toFixed(3)).toString();
}
//# sourceMappingURL=NumericControl.js.map