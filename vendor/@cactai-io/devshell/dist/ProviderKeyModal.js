// packages/devshell/src/ProviderKeyModal.tsx
// Mid-turn modal shown when a tool requires a provider key that isn't
// configured or was rejected. The user can either:
//   - Paste the missing key, pick which provider it belongs to, save it,
//     and have the in-flight turn replay automatically.
//   - Dismiss the modal with Esc / Cancel and the turn stays unresolved
//     (the calling shell decides whether to show the error inline).
//
// Provider list comes from /v1/providers (capability_providers endpoint).
// Keys are stored via /v1/developer/keys, the same plumbing the dashboard
// settings page uses. The cactai base URL comes from props since this
// component ships as a package and can't reach into the skeleton's @/lib.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
export function ProviderKeyModal({ detail, endpoints, onSaved, onDismiss }) {
    const [provider, setProvider] = useState(detail.provider);
    const [keyText, setKeyText] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const inputRef = useRef(null);
    // Focus the key input and wire Esc-to-dismiss.
    useEffect(() => {
        inputRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape')
                onDismiss();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onDismiss]);
    const save = async () => {
        setBusy(true);
        setErr(null);
        try {
            const res = await fetch(`${endpoints.cactaiBase}/v1/developer/keys`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, api_key: keyText, set_default: true }),
            });
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`Save failed: ${res.status} ${body.slice(0, 200)}`);
            }
            await onSaved();
        }
        catch (e) {
            setErr(e instanceof Error ? e.message : 'Could not save key');
            setBusy(false);
        }
    };
    // Reason → headline + sub copy. The platform sends one of four reasons.
    const headline = detail.reason === 'missing_key'
        ? `${detail.capability} needs a key`
        : detail.reason === 'rejected'
            ? `${detail.capability} key was rejected`
            : detail.reason === 'rate_limited'
                ? `${detail.capability} is rate-limited`
                : `${detail.capability} couldn't reach ${detail.provider}`;
    return (_jsx("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "cap-modal-headline", className: "ds-provider-key-backdrop", style: {
            position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, fontFamily: 'Sora, system-ui, sans-serif',
        }, onClick: (e) => { if (e.target === e.currentTarget)
            onDismiss(); }, children: _jsxs("div", { className: "ds-provider-key-card", style: {
                background: '#13131A', border: '1px solid #2A2A33', borderRadius: 12,
                width: 'min(480px, 92vw)', padding: '24px', color: '#E8E8EF',
                boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
            }, children: [_jsx("h2", { id: "cap-modal-headline", style: { margin: 0, fontSize: 16, fontWeight: 600 }, children: headline }), _jsx("p", { style: { marginTop: 8, marginBottom: 18, fontSize: 13, lineHeight: 1.55, color: '#A5A5B6' }, children: detail.message }), detail.reason === 'rate_limited' ? (_jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }, children: [_jsx("button", { style: btn('ghost'), onClick: onDismiss, children: "Close" }), _jsx("button", { style: btn('primary'), onClick: onSaved, disabled: busy, children: "Retry" })] })) : (_jsxs(_Fragment, { children: [_jsx("label", { style: { display: 'block', fontSize: 11, color: '#A5A5B6', marginBottom: 6 }, children: "Provider" }), _jsxs("select", { value: provider, onChange: (e) => setProvider(e.target.value), style: selectStyle, children: [_jsx("option", { value: "anthropic", children: "Anthropic" }), _jsx("option", { value: "openai", children: "OpenAI" })] }), _jsx("label", { style: { display: 'block', fontSize: 11, color: '#A5A5B6', marginTop: 14, marginBottom: 6 }, children: "API key" }), _jsx("input", { ref: inputRef, type: "password", value: keyText, onChange: (e) => setKeyText(e.target.value), placeholder: provider === 'anthropic' ? 'sk-ant-...' : 'sk-...', autoComplete: "off", style: inputStyle, onKeyDown: (e) => { if (e.key === 'Enter' && keyText.length > 10 && !busy)
                                void save(); } }), _jsxs("p", { style: { fontSize: 11, color: '#5A5A6E', marginTop: 6 }, children: ["Stored encrypted in your developer account. Set as your default for ", provider, " immediately."] }), err && (_jsx("p", { style: { fontSize: 12, color: '#E64C4C', marginTop: 10 }, children: err })), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }, children: [_jsx("button", { style: btn('ghost'), onClick: onDismiss, disabled: busy, children: "Cancel" }), _jsx("button", { style: { ...btn('primary'), opacity: keyText.length > 10 && !busy ? 1 : 0.5 }, onClick: save, disabled: keyText.length <= 10 || busy, children: busy ? 'Saving…' : 'Save & retry' })] })] }))] }) }));
}
const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 8,
    background: '#0A0A0F', border: '1px solid #2A2A33',
    color: '#E8E8EF', fontSize: 13, fontFamily: 'inherit', outline: 'none',
};
const selectStyle = {
    ...inputStyle,
    appearance: 'none',
    paddingRight: 28,
};
function btn(kind) {
    return {
        padding: '8px 14px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
        cursor: 'pointer', border: '1px solid #2A2A33',
        background: kind === 'primary' ? '#3C7EF7' : 'transparent',
        color: kind === 'primary' ? '#FFFFFF' : '#E8E8EF',
    };
}
