import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DURATION_PRESETS = [
    { label: 'fast (150ms)', value: 'var(--d-fast)' },
    { label: 'base (250ms)', value: 'var(--d-base)' },
    { label: 'slow (400ms)', value: 'var(--d-slow)' },
];
const EASING_PRESETS = [
    { label: 'linear', value: 'linear' },
    { label: 'ease', value: 'ease' },
    { label: 'ease-in', value: 'ease-in' },
    { label: 'ease-out', value: 'ease-out' },
    { label: 'standard (--ease)', value: 'var(--ease)' },
    { label: 'spring (--ease-spring)', value: 'var(--ease-spring)' },
];
export function TransitionControl({ path, value, locked, onChange, }) {
    const str = typeof value === 'number' ? `${value}ms` : value;
    const kind = inferKind(str);
    if (kind === 'duration') {
        const ms = parseMs(str);
        return (_jsxs("div", { className: "ti-control-body", "data-locked": locked, children: [_jsx("div", { className: "ti-row", children: _jsx("input", { type: "range", className: "ti-slider", min: 50, max: 800, step: 10, value: ms, onChange: e => onChange(`${e.target.value}ms`), disabled: locked, "aria-label": `${path} duration` }) }), _jsx("div", { className: "ti-row", children: _jsx("input", { type: "text", className: "ti-input", value: str, onChange: e => onChange(e.target.value), disabled: locked, spellCheck: false }) }), _jsx("div", { className: "ti-row", role: "radiogroup", "aria-label": "Duration presets", children: DURATION_PRESETS.map(p => (_jsx("button", { className: "ti-cancel", onClick: () => onChange(p.value), disabled: locked, children: p.label }, p.value))) })] }));
    }
    if (kind === 'easing') {
        return (_jsxs("div", { className: "ti-control-body", "data-locked": locked, children: [_jsx("div", { className: "ti-row", children: _jsxs("select", { className: "ti-input", value: EASING_PRESETS.find(p => p.value === str)?.value ?? '__custom__', onChange: e => {
                            if (e.target.value !== '__custom__')
                                onChange(e.target.value);
                        }, disabled: locked, "aria-label": `${path} easing`, children: [EASING_PRESETS.map(p => _jsx("option", { value: p.value, children: p.label }, p.value)), _jsx("option", { value: "__custom__", children: "Custom cubic-bezier\u2026" })] }) }), _jsx("div", { className: "ti-row", children: _jsx("input", { type: "text", className: "ti-input", value: str, onChange: e => onChange(e.target.value), disabled: locked, placeholder: "cubic-bezier(0.4, 0, 0.2, 1)", spellCheck: false }) })] }));
    }
    // Composite transition shorthand or unknown — raw edit only.
    return (_jsxs("div", { className: "ti-control-body", "data-locked": locked, children: [_jsx("div", { className: "ti-row", children: _jsx("input", { type: "text", className: "ti-input", value: str, onChange: e => onChange(e.target.value), disabled: locked, spellCheck: false, "aria-label": path }) }), _jsx("p", { style: { fontSize: 11, color: 'var(--c-text-2)', margin: 0 }, children: "Composite transition value \u2014 split into duration + easing tokens for structured editing." })] }));
}
function inferKind(s) {
    if (/^\d+\.?\d*m?s$/.test(s.trim()))
        return 'duration';
    if (/^var\(--d-/.test(s.trim()))
        return 'duration';
    if (/^cubic-bezier\(/.test(s.trim()) || /^(linear|ease|ease-in|ease-out|ease-in-out)$/.test(s.trim()))
        return 'easing';
    if (/^var\(--ease/.test(s.trim()))
        return 'easing';
    return 'composite';
}
function parseMs(s) {
    const m = /(\d+\.?\d*)\s*ms$/.exec(s);
    return m ? Number(m[1]) : 250;
}
//# sourceMappingURL=TransitionControl.js.map