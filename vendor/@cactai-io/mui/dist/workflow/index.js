'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/workflow/index.tsx
// All workflow surface components.
//
// WorkflowSurface — stage-aware wrapper, renders the correct content per step
// DecisionLog       — scrollable log with dependency visualization
// GoalBacklog       — deferred goals with dependency status and sprint targeting
// SprintOverview    — sprint scope confirmation and merge gate
// DecisionInput     — routes to the correct input method component
// Input methods:    ButtonSelect, MultiSelect, DragRank, ColorPicker, PersonalityCards
//
// The agent calls surface_form to signal which input method to render.
// The developer's choices are sent back via the chat input (record_decision tool call).
// This surface never calls APIs directly — all state changes go through MUIShell.submitInput.
// Consumes theme via CSS custom properties from @cactai-io/brand-tokens.
import { useState, useRef } from 'react';
export function WorkflowSurface({ activeForm, decisions, backlog, sprints, onFormSubmit, onRevisit, onResolveBacklog, onCreateBacklog, onUpdateBacklog, onDeleteBacklog, onRenameSprint, onDeleteSprint, projectNotes, onSaveProjectNotes, decisionNotes, onAddDecisionNote, }) {
    const unresolved = backlog.filter(e => !e.acknowledged);
    const activeSprint = sprints.find(s => s.status === 'active');
    const planSprints = sprints.filter(s => s.status !== 'abandoned');
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%', overflow: 'hidden' }, children: [_jsx("div", { style: {
                    borderRight: '1px solid var(--ds-border-soft)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }, children: _jsx(DecisionLog, { decisions: decisions, onRevisit: onRevisit, decisionNotes: decisionNotes, onAddDecisionNote: onAddDecisionNote }) }), _jsx("div", { style: { overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }, children: activeForm ? (_jsx(DecisionInput, { stage: activeForm.stage, fields: activeForm.fields, onSubmit: onFormSubmit })) : (_jsxs(_Fragment, { children: [planSprints.length > 0 && (_jsx(SprintOverview, { sprints: planSprints, activeSprint: activeSprint, onRename: onRenameSprint, onDelete: onDeleteSprint })), unresolved.length > 0 && (_jsx(GoalBacklog, { entries: unresolved, onResolve: onResolveBacklog, onCreate: onCreateBacklog, onUpdate: onUpdateBacklog, onDelete: onDeleteBacklog })), onSaveProjectNotes && (_jsx(NotesPanel, { value: projectNotes ?? '', onSave: onSaveProjectNotes }))] })) })] }));
}
function NotesPanel({ value, onSave }) {
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    // Re-sync when the persisted value changes (e.g. first load after fetch).
    const lastValue = useRef(value);
    if (lastValue.current !== value) {
        lastValue.current = value;
        if (draft === '' || draft === lastValue.current)
            setDraft(value);
    }
    const dirty = draft !== value;
    async function save() {
        setSaving(true);
        setSaved(false);
        try {
            await onSave(draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: { flex: 1, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ds-text-3)' }, children: "Notes" }), saved && _jsx("span", { style: { fontSize: 11, color: 'var(--c-accent, #5fb6ff)' }, children: "Saved" }), _jsx("button", { className: "ds-btn-ghost", disabled: !dirty || saving, onClick: () => void save(), style: { fontSize: 11.5, padding: '4px 12px', opacity: !dirty || saving ? 0.5 : 1 }, children: saving ? 'Saving…' : 'Save' })] }), _jsx("textarea", { value: draft, onChange: e => setDraft(e.target.value), placeholder: "Free-form notes for this project \u2014 decisions to revisit, ideas, reminders\u2026", rows: 8, style: {
                    width: '100%',
                    background: 'var(--ds-elevated)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 'var(--ds-r-sm)',
                    padding: 12,
                    color: 'var(--ds-text)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: 'var(--f-ui)',
                    resize: 'vertical',
                    outline: 'none',
                } })] }));
}
function DecisionLog({ decisions, onRevisit, decisionNotes, onAddDecisionNote }) {
    const [highlighted, setHighlighted] = useState(new Set());
    // Which decision's note thread is currently expanded (only one at a time).
    const [openThread, setOpenThread] = useState(null);
    const entries = Object.entries(decisions);
    function showUpstream(key, record) {
        setHighlighted(new Set(record.informed_by));
    }
    function clearHighlight() {
        setHighlighted(new Set());
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { style: {
                    padding: '14px 16px',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ds-text-3)',
                    borderBottom: '1px solid var(--ds-border-soft)',
                    flexShrink: 0,
                }, children: "Decision log" }), _jsxs("div", { style: { overflow: 'auto', flex: 1, padding: '10px 0' }, children: [entries.length === 0 && (_jsx("div", { style: { padding: '16px', fontSize: 12, color: 'var(--ds-text-3)' }, children: "No decisions yet." })), entries.map(([key, record]) => {
                        const isDimmed = highlighted.size > 0 && !highlighted.has(key);
                        const isHighlighted = highlighted.has(key);
                        const notes = decisionNotes?.[key] ?? [];
                        const threadOpen = openThread === key;
                        return (_jsxs("div", { style: {
                                padding: '8px 16px',
                                opacity: isDimmed ? 0.3 : 1,
                                transition: 'opacity 0.15s',
                                borderLeft: isHighlighted ? '2px solid var(--ds-pink)' : '2px solid transparent',
                            }, onMouseEnter: () => showUpstream(key, record), onMouseLeave: clearHighlight, children: [_jsxs("div", { style: { cursor: 'pointer' }, onClick: () => onRevisit(key), title: "Click to revisit this decision", children: [_jsx("div", { style: { fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--ds-text-3)', marginBottom: 2 }, children: key }), _jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text)', fontWeight: 500 }, children: typeof record.value === 'boolean'
                                                ? (record.value ? 'Yes' : 'No')
                                                : String(record.value) }), _jsx("div", { style: { fontSize: 10, color: 'var(--ds-text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }, children: record.method }), (record.informed_by?.length ?? 0) > 0 && (_jsxs("div", { style: { fontSize: 9.5, color: 'var(--ds-text-3)', marginTop: 3 }, children: ["\u2191 ", record.informed_by.join(', ')] }))] }), onAddDecisionNote && (_jsx("button", { onClick: () => setOpenThread(threadOpen ? null : key), style: {
                                        marginTop: 5,
                                        background: 'transparent',
                                        border: 'none',
                                        color: notes.length > 0 ? 'var(--c-accent, #5fb6ff)' : 'var(--ds-text-3)',
                                        cursor: 'pointer',
                                        fontSize: 10,
                                        padding: 0,
                                    }, children: notes.length > 0 ? `🗒 ${notes.length} note${notes.length === 1 ? '' : 's'}` : '+ note' })), threadOpen && onAddDecisionNote && (_jsx(DecisionNoteThread, { notes: notes, onAdd: (content) => onAddDecisionNote(key, content) }))] }, key));
                    })] })] }));
}
function DecisionNoteThread({ notes, onAdd }) {
    const [text, setText] = useState('');
    const [adding, setAdding] = useState(false);
    async function add() {
        const trimmed = text.trim();
        if (!trimmed)
            return;
        setAdding(true);
        try {
            await onAdd(trimmed);
            setText('');
        }
        finally {
            setAdding(false);
        }
    }
    return (_jsxs("div", { style: {
            marginTop: 6,
            padding: 8,
            background: 'var(--ds-canvas, var(--ds-surface))',
            border: '1px solid var(--ds-border-soft)',
            borderRadius: 'var(--ds-r-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
        }, children: [notes.map((n, i) => (_jsxs("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: [_jsx("div", { style: { color: 'var(--ds-text-3)', fontSize: 9 }, children: new Date(n.at).toLocaleString() }), _jsx("div", { style: { color: 'var(--ds-text-2)', whiteSpace: 'pre-wrap' }, children: n.content })] }, i))), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("input", { value: text, onChange: e => setText(e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                            void add(); }, placeholder: "Add a note\u2026", style: {
                            flex: 1,
                            background: 'var(--ds-elevated)',
                            border: '1px solid var(--ds-border)',
                            borderRadius: 'var(--ds-r-sm)',
                            padding: '4px 8px',
                            color: 'var(--ds-text)',
                            fontSize: 11,
                            outline: 'none',
                        } }), _jsx("button", { className: "ds-btn-ghost", disabled: !text.trim() || adding, onClick: () => void add(), style: { fontSize: 11, padding: '4px 10px', opacity: !text.trim() || adding ? 0.5 : 1 }, children: adding ? '…' : 'Add' })] })] }));
}
function DecisionInput({ stage, fields, onSubmit }) {
    const [choices, setChoices] = useState({});
    function setChoice(key, value) {
        setChoices(prev => ({ ...prev, [key]: value }));
    }
    // Pre-populate recommended values
    const initialised = useRef(false);
    if (!initialised.current) {
        const pre = {};
        for (const f of fields) {
            if (f.recommended !== undefined)
                pre[f.key] = f.recommended;
        }
        if (Object.keys(pre).length)
            setChoices(pre);
        initialised.current = true;
    }
    const allAnswered = fields.every(f => f.type === 'chat' || choices[f.key] !== undefined);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 560 }, children: [_jsx("div", { style: { fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ds-text-3)' }, children: stage }), fields.map(field => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--ds-text)' }, children: field.label }), field.type === 'single_select' && (_jsx(ButtonSelect, { options: field.options ?? [], value: choices[field.key], recommended: field.recommended, rationale: field.rationale, onChange: v => setChoice(field.key, v), multi: false })), field.type === 'multi_select' && (_jsx(ButtonSelect, { options: field.options ?? [], value: choices[field.key], recommended: field.recommended, rationale: field.rationale, onChange: v => setChoice(field.key, v), multi: true })), field.type === 'drag_rank' && (_jsx(DragRank, { options: field.options ?? [], value: choices[field.key], onChange: v => setChoice(field.key, v) })), field.type === 'color' && (_jsx(ColorPicker, { value: choices[field.key], onChange: v => setChoice(field.key, v) })), field.type === 'personality_card' && (_jsx(PersonalityCards, { options: field.options ?? [], value: choices[field.key], recommended: field.recommended, onChange: v => setChoice(field.key, v) })), field.type === 'chat' && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-2)', fontStyle: 'italic' }, children: "Answer in the chat panel \u2192" }))] }, field.key))), _jsx("button", { className: "ds-btn-primary", disabled: !allAnswered, onClick: () => onSubmit(choices), style: { alignSelf: 'flex-start' }, children: "Confirm choices" })] }));
}
function ButtonSelect({ options, value, recommended, rationale, onChange, multi }) {
    function isSelected(opt) {
        if (multi)
            return Array.isArray(value) && value.includes(opt);
        return value === opt;
    }
    function toggle(opt) {
        if (multi) {
            const cur = Array.isArray(value) ? value : [];
            onChange(cur.includes(opt) ? cur.filter(v => v !== opt) : [...cur, opt]);
        }
        else {
            onChange(opt);
        }
    }
    return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: options.map(opt => (_jsxs("button", { className: `ds-option-btn${isSelected(opt) ? ' ds-option-selected' : ''}${opt === recommended ? ' ds-option-recommended' : ''}`, onClick: () => toggle(opt), style: { minWidth: 100 }, children: [_jsx("span", { className: "ds-option-label", children: opt }), opt === recommended && rationale && (_jsx("span", { className: "ds-option-rationale", children: rationale }))] }, opt))) }) }));
}
// DragRank — drag-to-reorder list
function DragRank({ options, value, onChange }) {
    const [items, setItems] = useState(value ?? options);
    const dragIdx = useRef(null);
    function onDragStart(i) { dragIdx.current = i; }
    function onDragOver(e, i) {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === i)
            return;
        const next = [...items];
        const [moved] = next.splice(dragIdx.current, 1);
        next.splice(i, 0, moved);
        dragIdx.current = i;
        setItems(next);
        onChange(next);
    }
    return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: items.map((item, i) => (_jsxs("div", { draggable: true, onDragStart: () => onDragStart(i), onDragOver: e => onDragOver(e, i), className: "ds-card", style: { cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }, children: [_jsx("span", { style: { color: 'var(--ds-text-3)', fontSize: 13, userSelect: 'none' }, children: "\u283F" }), _jsx("span", { style: { fontSize: 13, fontWeight: 500, color: 'var(--ds-text)' }, children: item }), _jsxs("span", { style: { marginLeft: 'auto', fontSize: 11, color: 'var(--ds-text-3)' }, children: ["#", i + 1] })] }, item))) }));
}
// ColorPicker — preset swatches + custom hex input
const PRESETS = [
    // intentionally outside brand tokens — semantic role differs from theme accent.
    '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
    '#F97316', '#EAB308', '#22C55E', '#14B8A6',
    '#3B82F6', '#0EA5E9', '#F5F5FA', '#1A1A22',
];
function ColorPicker({ value, onChange }) {
    const [custom, setCustom] = useState(value ?? '');
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: PRESETS.map(color => (_jsx("button", { onClick: () => { onChange(color); setCustom(color); }, style: {
                        width: 32, height: 32,
                        borderRadius: 'var(--ds-r-sm)',
                        background: color,
                        border: value === color ? '2px solid var(--ds-text)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                    }, title: color }, color))) }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("div", { style: {
                            width: 32, height: 32,
                            borderRadius: 'var(--ds-r-sm)',
                            background: custom || 'var(--ds-elevated)',
                            border: '1px solid var(--ds-border)',
                            flexShrink: 0,
                        } }), _jsx("input", { type: "text", value: custom, onChange: e => { setCustom(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
                            onChange(e.target.value); }, placeholder: "#hex", style: {
                            background: 'var(--ds-elevated)',
                            border: '1px solid var(--ds-border)',
                            borderRadius: 'var(--ds-r-sm)',
                            padding: '6px 10px',
                            color: 'var(--ds-text)',
                            fontSize: 12.5,
                            fontFamily: 'var(--f-mono)',
                            width: 110,
                            outline: 'none',
                        } })] })] }));
}
// PersonalityCards — selectable personality preview cards
function PersonalityCards({ options, value, recommended, onChange }) {
    const PERSONALITY_PREVIEWS = {
        milo: {
            tone: 'Encouraging · Playful · Celebratory',
            sample: "Done! That form is live. Want to add validation next, or should we move on to the dashboard?"
        },
        sam: {
            tone: 'Direct · Professional · Concise',
            sample: "Form component created. Three fields: name, email, message. Wired to /api/contact. Ready to test."
        },
        owl: {
            tone: 'Matter-of-fact · Slightly pretentious',
            sample: "Obviously the form needed validation. I've added it. You're welcome."
        },
    };
    return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: options.map(opt => {
            const preview = PERSONALITY_PREVIEWS[opt.toLowerCase()];
            const isSelected = value === opt;
            return (_jsxs("button", { className: `ds-option-btn${isSelected ? ' ds-option-selected' : ''}${opt === recommended ? ' ds-option-recommended' : ''}`, onClick: () => onChange(opt), style: { textAlign: 'left' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }, children: [_jsx("span", { className: "ds-option-label", style: { fontSize: 14 }, children: opt }), opt === recommended && _jsx("span", { className: "ds-badge ds-badge-active", style: { fontSize: 9 }, children: "recommended" })] }), preview && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginBottom: 6, letterSpacing: '0.04em' }, children: preview.tone }), _jsxs("div", { style: {
                                    fontSize: 12,
                                    color: 'var(--ds-text-2)',
                                    background: 'var(--ds-canvas)',
                                    borderRadius: 'var(--ds-r-sm)',
                                    padding: '8px 10px',
                                    lineHeight: 1.55,
                                    fontStyle: 'italic',
                                }, children: ["\"", preview.sample, "\""] })] }))] }, opt));
        }) }));
}
function GoalBacklog({ entries, onResolve, onCreate, onUpdate, onDelete }) {
    const [editingId, setEditingId] = useState(null);
    const [editingTxt, setEditingTxt] = useState('');
    const [adding, setAdding] = useState(false);
    const [newText, setNewText] = useState('');
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("div", { style: { flex: 1, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ds-text-3)' }, children: ["Goal backlog \u00B7 ", entries.length, " item", entries.length !== 1 ? 's' : ''] }), onCreate && !adding && (_jsx("button", { className: "ds-btn-ghost", onClick: () => { setAdding(true); setNewText(''); }, style: { fontSize: 10.5, padding: '4px 10px' }, children: "+ Add" }))] }), adding && onCreate && (_jsxs("div", { className: "ds-card", children: [_jsx("textarea", { value: newText, onChange: e => setNewText(e.target.value), placeholder: "Describe the goal to track\u2026", rows: 2, autoFocus: true, style: {
                            width: '100%', fontSize: 13, padding: 8,
                            background: 'var(--ds-elevated)', color: 'var(--ds-text)',
                            border: '1px solid var(--ds-border)', borderRadius: 6,
                            resize: 'vertical', fontFamily: 'inherit',
                        } }), _jsxs("div", { style: { display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }, children: [_jsx("button", { className: "ds-btn-ghost", onClick: () => setAdding(false), style: { fontSize: 10.5, padding: '4px 10px' }, children: "Cancel" }), _jsx("button", { className: "ds-btn-primary", disabled: !newText.trim(), onClick: async () => { await onCreate(newText.trim()); setAdding(false); setNewText(''); }, style: { fontSize: 10.5, padding: '4px 10px' }, children: "Add" })] })] })), entries.map(entry => (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsx("div", { style: { flex: 1 }, children: editingId === entry.id && onUpdate ? (_jsxs(_Fragment, { children: [_jsx("textarea", { value: editingTxt, onChange: e => setEditingTxt(e.target.value), rows: 2, autoFocus: true, style: {
                                            width: '100%', fontSize: 13, padding: 8,
                                            background: 'var(--ds-elevated)', color: 'var(--ds-text)',
                                            border: '1px solid var(--ds-border)', borderRadius: 6,
                                            resize: 'vertical', fontFamily: 'inherit',
                                        } }), _jsxs("div", { style: { display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }, children: [_jsx("button", { className: "ds-btn-ghost", onClick: () => setEditingId(null), style: { fontSize: 10.5, padding: '4px 10px' }, children: "Cancel" }), _jsx("button", { className: "ds-btn-primary", disabled: !editingTxt.trim(), onClick: async () => { await onUpdate(entry.id, editingTxt.trim()); setEditingId(null); }, style: { fontSize: 10.5, padding: '4px 10px' }, children: "Save" })] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 13, color: 'var(--ds-text)', lineHeight: 1.55, marginBottom: 6 }, children: entry.description }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("span", { className: `ds-badge ${entry.source === 'tangent_capture' ? 'ds-badge-dev' : 'ds-badge-sdk'}`, style: { fontSize: 9 }, children: entry.source === 'tangent_capture' ? 'captured tangent' : entry.source.replace('_', ' ') }), (entry.depends_on_decisions?.length ?? 0) > 0 && (_jsxs("span", { style: { fontSize: 10, color: 'var(--ds-text-3)' }, children: ["depends on: ", entry.depends_on_decisions.join(', ')] })), !entry.surfaced && (_jsx("span", { style: { fontSize: 9.5, color: 'var(--ds-orange)' }, children: "\u25CF new" }))] })] })) }), editingId !== entry.id && (_jsxs("div", { style: { display: 'flex', gap: 4, flexShrink: 0 }, children: [onUpdate && (_jsx("button", { className: "ds-btn-ghost", onClick: () => { setEditingId(entry.id); setEditingTxt(entry.description); }, style: { fontSize: 10.5, padding: '4px 8px' }, title: "Edit", children: "\u270E" })), _jsx("button", { className: "ds-btn-ghost", onClick: () => onResolve(entry.id), style: { fontSize: 10.5, padding: '4px 10px' }, children: "Dismiss" }), onDelete && (_jsx("button", { className: "ds-btn-ghost", onClick: () => { if (window.confirm('Delete this backlog entry?'))
                                        void onDelete(entry.id); }, style: { fontSize: 10.5, padding: '4px 8px', color: 'var(--c-error, #f66)' }, title: "Delete", children: "\uD83D\uDDD1" }))] }))] }) }, entry.id)))] }));
}
function SprintOverview({ sprints, activeSprint, onRename, onDelete }) {
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const merged = sprints.filter(s => s.status === 'merged').length;
    const total = sprints.length;
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("div", { style: { fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ds-text-3)' }, children: "Sprints" }), _jsxs("div", { style: { fontSize: 11.5, color: 'var(--ds-text-2)' }, children: [merged, " of ", total, " shipped"] })] }), _jsx("div", { className: "ds-progress", children: _jsx("div", { className: "ds-progress-fill", style: { width: total > 0 ? `${(merged / total) * 100}%` : '0%' } }) }), sprints.map(sprint => {
                const goals = sprint.goals ?? [];
                const done = goals.filter(g => g.status === 'complete').length;
                const total = goals.length;
                const pct = total > 0 ? (done / total) * 100 : 0;
                const isActive = sprint.id === activeSprint?.id;
                return (_jsxs("div", { className: "ds-card", style: { borderColor: isActive ? 'rgba(255,60,119,0.2)' : undefined }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: isActive ? 10 : 0 }, children: [editingId === sprint.id && onRename ? (_jsxs(_Fragment, { children: [_jsx("input", { value: editingName, onChange: e => setEditingName(e.target.value), autoFocus: true, onKeyDown: e => {
                                                if (e.key === 'Enter' && editingName.trim()) {
                                                    void onRename(sprint.id, editingName.trim());
                                                    setEditingId(null);
                                                }
                                                else if (e.key === 'Escape') {
                                                    setEditingId(null);
                                                }
                                            }, style: {
                                                flex: 1, fontSize: 12.5,
                                                background: 'var(--ds-elevated)', color: 'var(--ds-text)',
                                                border: '1px solid var(--ds-border)', borderRadius: 4,
                                                padding: '3px 6px',
                                            } }), _jsx("button", { onClick: () => { if (editingName.trim()) {
                                                void onRename(sprint.id, editingName.trim());
                                                setEditingId(null);
                                            } }, style: { fontSize: 11, padding: '3px 8px', background: 'var(--c-accent, #5fb6ff)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }, children: "Save" }), _jsx("button", { onClick: () => setEditingId(null), style: { fontSize: 11, padding: '3px 8px', background: 'transparent', color: 'var(--ds-text-2)', border: '1px solid var(--ds-border)', borderRadius: 4, cursor: 'pointer' }, children: "Cancel" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { style: { flex: 1, fontSize: 12.5, fontWeight: isActive ? 600 : 400, color: 'var(--ds-text)' }, children: sprint.name }), onRename && sprint.status !== 'active' && (_jsx("button", { onClick: () => { setEditingId(sprint.id); setEditingName(sprint.name); }, title: "Rename sprint", style: { fontSize: 11, padding: '2px 6px', background: 'transparent', color: 'var(--ds-text-2)', border: 'none', cursor: 'pointer' }, children: "\u270E" })), onDelete && sprint.status !== 'active' && (_jsx("button", { onClick: () => { if (window.confirm(`Delete sprint "${sprint.name}"? This cannot be undone.`))
                                                void onDelete(sprint.id); }, title: "Delete sprint", style: { fontSize: 11, padding: '2px 6px', background: 'transparent', color: 'var(--c-error, #f66)', border: 'none', cursor: 'pointer' }, children: "\uD83D\uDDD1" }))] })), _jsx("span", { className: `ds-badge ${sprint.status === 'merged' ? 'ds-badge-active' :
                                        sprint.status === 'active' ? 'ds-badge-marketplace' :
                                            sprint.status === 'review' ? 'ds-badge-dev' :
                                                'ds-badge-sdk'}`, style: { fontSize: 9 }, children: sprint.status })] }), isActive && total > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ds-text-3)', marginBottom: 4 }, children: [_jsx("span", { children: sprint.definition_of_done }), _jsxs("span", { children: [done, "/", total] })] }), _jsx("div", { className: "ds-progress", children: _jsx("div", { className: "ds-progress-fill", style: { width: `${pct}%` } }) })] }))] }, sprint.id));
            })] }));
}
// Export everything
export { DecisionLog, DecisionInput, GoalBacklog, SprintOverview, ButtonSelect, DragRank, ColorPicker, PersonalityCards, };
//# sourceMappingURL=index.js.map