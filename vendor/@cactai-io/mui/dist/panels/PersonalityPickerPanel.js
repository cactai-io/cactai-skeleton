'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/PersonalityPickerPanel.tsx
// v1.2 Thread 07 — personality picker.
//
// Renders all available personalities (built-ins + dev-authored) as
// selectable cards. Selecting a card auto-saves the swap (no separate
// "Switch personality" button). The "Edit" affordance opens the editor
// for dev-authored personalities only — built-ins are read-only and
// surface a hint directing the developer to create a new personality
// based on the built-in.
//
// On save failure the selection reverts.
//
// User-direction (2026-05-30): the cards speak for themselves — no
// section description, no "built-in" badge, no explicit Switch button.
// Built-in cards render in canonical order (Ember → Milo → SAM) above
// any developer-authored cards. The active-id source-of-truth bug
// where the UI badge and chat header disagreed is tracked separately
// in the wave-2 investigations.
import { useState } from 'react';
// Canonical built-in order. Anything matching one of these ids slots
// in by index; anything else (dev-authored personalities) appends
// after, in the order the host supplied.
const BUILTIN_ORDER = ['ember', 'milo', 'sam'];
function orderPersonalities(list) {
    const byId = new Map(list.map(p => [p.id.toLowerCase(), p]));
    const ordered = [];
    for (const id of BUILTIN_ORDER) {
        const hit = byId.get(id);
        if (hit) {
            ordered.push(hit);
            byId.delete(id);
        }
    }
    for (const p of list) {
        if (byId.has(p.id.toLowerCase()))
            ordered.push(p);
    }
    return ordered;
}
export function PersonalityPickerPanel({ active_id, available, onConfirm, onOpenEditor, onCreate, }) {
    // `pending` holds the id the user just clicked while the swap is
    // in flight. On success, active_id (from props) takes over. On
    // failure, pending clears and the UI reverts.
    const [pending, setPending] = useState(null);
    const [error, setError] = useState(null);
    async function pick(id) {
        if (id === active_id || pending)
            return;
        setPending(id);
        setError(null);
        try {
            await onConfirm({ active_id: id });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to swap personality');
        }
        finally {
            setPending(null);
        }
    }
    const ordered = orderPersonalities(available);
    return (_jsx("div", { children: _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Personality" }), ordered.map((p) => {
                    const isActive = active_id === p.id;
                    const isPending = pending === p.id;
                    const isCustom = p.source === 'developer_authored';
                    return (_jsx("div", { className: "ds-card", role: "button", tabIndex: 0, onClick: () => pick(p.id), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ')
                            void pick(p.id); }, "aria-disabled": !!pending, style: {
                            cursor: pending ? 'wait' : 'pointer',
                            borderColor: isActive ? 'var(--ds-accent, #6A4AE0)' : undefined,
                            borderWidth: isActive ? 2 : undefined,
                            opacity: pending && !isPending ? 0.6 : 1,
                        }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsx("input", { type: "radio", name: "personality-picker", checked: isActive, onChange: () => void pick(p.id), "aria-label": `Activate ${p.display_name}`, style: { marginTop: 2 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 13 }, children: p.display_name }), isActive && _jsx("span", { className: "ds-badge ds-badge-active", children: "active" }), isPending && _jsx("span", { className: "ds-badge", children: "switching\u2026" }), isCustom && _jsx("span", { className: "ds-badge ds-badge-dev", children: "custom" })] }), _jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-text-3)', marginBottom: 4 }, children: p.description }), _jsxs("div", { style: { fontSize: 11.5, color: 'var(--ds-text)', fontStyle: 'italic' }, children: ["\u201C", p.sample_line, "\u201D"] })] }), isCustom && (_jsx("button", { className: "ds-btn-ghost", onClick: (e) => { e.stopPropagation(); onOpenEditor(p.id); }, style: { fontSize: 11, padding: '4px 10px', flexShrink: 0 }, children: "Edit" }))] }) }, p.id));
                }), onCreate && (_jsxs("div", { className: "ds-card", role: "button", tabIndex: 0, onClick: onCreate, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ')
                        onCreate(); }, style: {
                        cursor: 'pointer',
                        borderStyle: 'dashed',
                        textAlign: 'center',
                    }, children: [_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-2, var(--ds-text))' }, children: "+ Create new personality" }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', marginTop: 4 }, children: "Author one in chat. Appears here once saved." })] })), error && (_jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-danger, #E33)', marginTop: 6 }, children: error }))] }) }));
}
//# sourceMappingURL=PersonalityPickerPanel.js.map