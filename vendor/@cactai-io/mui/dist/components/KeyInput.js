import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/components/KeyInput.tsx
//
// The canonical secret/API-key input (v1.4 LOCKED key-input pattern).
//
//   - A manually-typed key is READABLE (plaintext) WHILE TYPING, so the dev
//     can validate they entered it correctly.
//   - On commit (blur with a non-empty value) it OBSCURES.
//   - An eye icon toggles reveal of a committed value.
//   - A checkbox-filled KNOWN key (e.g. the DevShell key) inserts already
//     obscured (`startObscured`) — no validation needed.
//
// Replaces the legacy `type="password"` inputs that obscured DURING typing
// (the provisioning-wizard bug: impossible to confirm you typed the key right).
import { useState } from 'react';
const EyeIcon = ({ off }) => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("path", { d: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" }), off && _jsx("line", { x1: "3", y1: "3", x2: "21", y2: "21" })] }));
export function KeyInput({ value, onChange, placeholder, startObscured = false, onCommit, disabled = false, ariaLabel = 'Secret key', style, inputStyle, className, }) {
    // `committed` = the value is settled and should be masked. Starts true only
    // for a prefilled known key. Editing (focus) un-commits → plaintext.
    const [committed, setCommitted] = useState(startObscured && value.length > 0);
    const [revealed, setRevealed] = useState(false);
    const masked = committed && !revealed;
    const showEye = committed && value.length > 0;
    return (_jsxs("div", { style: { position: 'relative', display: 'flex', alignItems: 'center', ...style }, children: [_jsx("input", { type: masked ? 'password' : 'text', className: className, value: value, disabled: disabled, "aria-label": ariaLabel, placeholder: placeholder, autoComplete: "off", spellCheck: false, onChange: e => onChange(e.target.value), onFocus: () => setCommitted(false), onBlur: () => {
                    if (value.trim().length > 0) {
                        setCommitted(true);
                        setRevealed(false);
                        onCommit?.(value);
                    }
                }, style: {
                    flex: 1,
                    width: '100%',
                    padding: showEye ? '8px 34px 8px 10px' : '8px 10px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    borderRadius: 6,
                    border: '1px solid var(--ds-border, #2e2e3c)',
                    background: 'var(--ds-input-bg, var(--ds-surface, #15151f))',
                    color: 'var(--ds-text, #e8e8f0)',
                    outline: 'none',
                    ...inputStyle,
                } }), showEye && (_jsx("button", { type: "button", tabIndex: -1, "aria-label": revealed ? 'Hide key' : 'Reveal key', onClick: () => setRevealed(r => !r), style: {
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, padding: 0,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--ds-text-secondary, #94a3b8)',
                }, children: _jsx(EyeIcon, { off: !revealed }) }))] }));
}
export default KeyInput;
//# sourceMappingURL=KeyInput.js.map