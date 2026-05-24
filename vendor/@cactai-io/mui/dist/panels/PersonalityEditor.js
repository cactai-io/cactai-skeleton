'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/PersonalityEditor.tsx
// v1.2 Thread 07 — editor for dev-authored personalities.
//
// Renders the editable fields (display_name, description, sample_line,
// identity, behavioral, constraints) plus a "Test" affordance that runs
// a sample turn in the edited personality's voice without committing the
// changes to the project's active personality.
//
// Built-ins are not edited here. When a built-in id is passed the editor
// returns null — the host should check the source flag and never call
// onLoad for built-ins. Defensive: if it happens anyway, the editor
// surfaces the "create new based on this" hint rather than erroring.
import { useEffect, useState } from 'react';
export function PersonalityEditor({ id, onLoad, onSave, onTest, onClose }) {
    const [state, setState] = useState('loading');
    const [error, setError] = useState(null);
    const [record, setRecord] = useState(null);
    // Local edit buffer. Edits flow into here until the developer hits Save.
    const [buf, setBuf] = useState({});
    // The local view of the definition (existing values overlaid with buf).
    const definition = (() => {
        if (!record)
            return null;
        return {
            identity: { ...record.definition.identity, ...(buf.definition?.identity ?? {}) },
            behavioral: { ...record.definition.behavioral, ...(buf.definition?.behavioral ?? {}) },
            constraints: { ...record.definition.constraints, ...(buf.definition?.constraints ?? {}) },
        };
    })();
    const [testResult, setTestResult] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setState('loading');
        setError(null);
        onLoad(id)
            .then((rec) => {
            if (cancelled)
                return;
            if (!rec) {
                setError('Built-in personalities cannot be edited. Create a new personality based on this one instead.');
                setState('idle');
                return;
            }
            setRecord(rec);
            setBuf({});
            setState('idle');
        })
            .catch((err) => {
            if (cancelled)
                return;
            setError(err instanceof Error ? err.message : 'Could not load personality');
            setState('idle');
        });
        return () => { cancelled = true; };
    }, [id, onLoad]);
    async function save() {
        if (!record || Object.keys(buf).length === 0)
            return;
        setState('saving');
        setError(null);
        try {
            const next = await onSave(id, buf);
            setRecord(next);
            setBuf({});
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        }
        finally {
            setState('idle');
        }
    }
    async function test() {
        if (!definition)
            return;
        setState('testing');
        setTestResult(null);
        try {
            const sample = await onTest(definition);
            setTestResult(sample);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Test failed');
        }
        finally {
            setState('idle');
        }
    }
    // Helpers for buffered edits to the definition's nested shape.
    function setDef(key, value) {
        setBuf((b) => ({
            ...b,
            definition: {
                ...(b.definition ?? {}),
                [key]: { ...(b.definition?.[key] ?? {}), ...value },
            },
        }));
    }
    if (state === 'loading') {
        return (_jsx("div", { className: "ds-panel-section", children: _jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "Loading personality\u2026" }) }));
    }
    if (error && !record) {
        return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-danger, #E33)' }, children: error }), _jsx("button", { className: "ds-btn-ghost", onClick: onClose, style: { fontSize: 11.5, marginTop: 8 }, children: "Back to picker" })] }));
    }
    if (!record || !definition)
        return null;
    const hasChanges = Object.keys(buf).length > 0;
    const saving = state === 'saving';
    const testing = state === 'testing';
    const inputStyle = {
        width: '100%',
        background: 'var(--ds-canvas)',
        border: '1px solid var(--ds-border)',
        borderRadius: 'var(--ds-r-sm)',
        padding: '6px 10px',
        color: 'var(--ds-text)',
        fontSize: 12,
        fontFamily: 'var(--f-ui)',
        outline: 'none',
    };
    const labelStyle = {
        fontSize: 11, color: 'var(--ds-text-3)', marginBottom: 3, display: 'block',
    };
    return (_jsx("div", { children: _jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { className: "ds-panel-section-title", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { children: "Edit personality" }), _jsx("button", { className: "ds-btn-ghost", onClick: onClose, style: { fontSize: 11 }, children: "Back to picker" })] }), _jsxs("div", { className: "ds-card", children: [_jsx("label", { style: labelStyle, children: "Display name" }), _jsx("input", { type: "text", value: buf.display_name ?? record.display_name, onChange: (e) => setBuf((b) => ({ ...b, display_name: e.target.value })), style: inputStyle })] }), _jsxs("div", { className: "ds-card", children: [_jsx("label", { style: labelStyle, children: "One-line description" }), _jsx("input", { type: "text", value: buf.description ?? record.description, onChange: (e) => setBuf((b) => ({ ...b, description: e.target.value })), style: inputStyle })] }), _jsxs("div", { className: "ds-card", children: [_jsx("label", { style: labelStyle, children: "Sample line" }), _jsx("input", { type: "text", value: buf.sample_line ?? record.sample_line, onChange: (e) => setBuf((b) => ({ ...b, sample_line: e.target.value })), style: inputStyle })] }), _jsxs("div", { className: "ds-card", children: [_jsx("label", { style: labelStyle, children: "Tone" }), _jsx("input", { type: "text", value: definition.behavioral.tone, onChange: (e) => setDef('behavioral', { tone: e.target.value }), style: inputStyle }), _jsx("label", { style: { ...labelStyle, marginTop: 8 }, children: "Communication style" }), _jsx("textarea", { value: definition.behavioral.communication, onChange: (e) => setDef('behavioral', { communication: e.target.value }), rows: 3, style: { ...inputStyle, fontFamily: 'var(--f-ui)' } }), _jsx("label", { style: { ...labelStyle, marginTop: 8 }, children: "Response length" }), _jsxs("select", { value: definition.behavioral.response_length, onChange: (e) => setDef('behavioral', {
                                response_length: e.target.value,
                            }), style: inputStyle, children: [_jsx("option", { value: "concise", children: "concise" }), _jsx("option", { value: "standard", children: "standard" }), _jsx("option", { value: "detailed", children: "detailed" })] }), _jsx("label", { style: { ...labelStyle, marginTop: 8 }, children: "Qualities (one per line)" }), _jsx("textarea", { value: definition.behavioral.qualities.join('\n'), onChange: (e) => setDef('behavioral', {
                                qualities: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                            }), rows: 4, style: { ...inputStyle, fontFamily: 'var(--f-ui)' } })] }), error && (_jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-danger, #E33)', marginTop: 6 }, children: error })), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { className: "ds-btn-ghost", onClick: test, disabled: testing, style: { fontSize: 11.5 }, children: testing ? 'Testing…' : 'Test sample turn' }), _jsx("button", { className: "ds-btn-primary", onClick: save, disabled: saving || !hasChanges, style: { fontSize: 11.5 }, children: saving ? 'Saving…' : 'Save changes' })] }), testResult && (_jsxs("div", { className: "ds-card", style: { marginTop: 8 }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', marginBottom: 4 }, children: "Test response" }), _jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text)' }, children: testResult })] }))] }) }));
}
//# sourceMappingURL=PersonalityEditor.js.map