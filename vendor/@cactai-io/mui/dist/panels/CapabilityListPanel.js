'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/panels/CapabilityListPanel.tsx
// v1.2 Thread 06 — tools/skills availability UI.
//
// Renders a scope-aware list of every catalogue item with a per-row toggle,
// a default radio (per category), source badges (built-in free / paid /
// custom), and a "Show hidden" affordance (appshell scope only).
//
// All saves use loading indicators on the affected row; never optimistic.
// On failure the row's state is reverted and the error surfaces inline.
//
// The component takes the catalogue + per-scope config + an onPatch
// callback. It does not call fetch directly — the host (the tabbed
// ProjectSettingsPanel or the DevShell preferences modal) owns the API
// surface.
import { useMemo, useState } from 'react';
// Default "enabled" semantics:
//   - If the project has set an explicit boolean in scope.enabled, honor it.
//   - Otherwise: every free built-in is on by default; paid built-ins are
//     off by default (developer opts in via the toggle).
function isEnabled(item, scope) {
    const explicit = scope.enabled[item.id];
    if (typeof explicit === 'boolean')
        return explicit;
    return item.source !== 'built_in_paid';
}
export function CapabilityListPanel({ scope, catalogue, config, allowHide, onPatch, only, }) {
    // Per-row loading + error state. Keyed by `${kind}:${id}` so the same
    // row can't collide with another section's row of the same id.
    const [rowLoading, setRowLoading] = useState({});
    const [rowError, setRowError] = useState({});
    const [showHidden, setShowHidden] = useState(false);
    const [resetting, setResetting] = useState(false);
    const rowKey = (kind, id) => `${kind}:${id}`;
    // Partition catalogue into tools + skills, and within each group into
    // "currently visible" vs "hidden". Hidden = explicitly disabled (only
    // possible in appshell scope per the prompt). Show-hidden surfaces
    // them at the bottom of each section.
    const grouped = useMemo(() => {
        const tools = [];
        const toolsHidden = [];
        const skills = [];
        const skillsHidden = [];
        for (const item of catalogue) {
            const explicitlyHidden = allowHide && config.enabled[item.id] === false;
            const target = item.kind === 'tool'
                ? (explicitlyHidden ? toolsHidden : tools)
                : (explicitlyHidden ? skillsHidden : skills);
            target.push(item);
        }
        return { tools, toolsHidden, skills, skillsHidden };
    }, [catalogue, config.enabled, allowHide]);
    async function applyPatch(item, patch) {
        const k = rowKey(item.kind, item.id);
        setRowLoading((p) => ({ ...p, [k]: true }));
        setRowError((p) => { const next = { ...p }; delete next[k]; return next; });
        try {
            await onPatch(patch);
        }
        catch (err) {
            setRowError((p) => ({
                ...p,
                [k]: err instanceof Error ? err.message : 'save failed',
            }));
        }
        finally {
            setRowLoading((p) => { const next = { ...p }; delete next[k]; return next; });
        }
    }
    async function applyReset() {
        setResetting(true);
        try {
            await onPatch({ scope, reset_to_defaults: true });
        }
        finally {
            setResetting(false);
        }
    }
    function renderRow(item) {
        const k = rowKey(item.kind, item.id);
        const enabled = isEnabled(item, config);
        const loading = !!rowLoading[k];
        const error = rowError[k];
        const disabled = !!item.paid_locked;
        const isDefault = config.defaults_by_category[item.category] === item.id;
        const sourceBadge = item.source === 'developer_authored'
            ? { label: 'custom', cls: 'ds-badge-dev' }
            : item.source === 'built_in_paid'
                ? { label: disabled ? 'paid · upgrade' : 'paid', cls: 'ds-badge-marketplace' }
                : { label: 'free', cls: 'ds-badge-sdk' };
        return (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: item.name }), _jsx("span", { className: `ds-badge ${sourceBadge.cls}`, children: sourceBadge.label }), _jsx("span", { className: "ds-badge ds-badge-sdk", style: { opacity: 0.65 }, children: item.category }), isDefault && _jsx("span", { className: "ds-badge ds-badge-active", children: "default" })] }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: item.description }), error && (_jsx("div", { style: { fontSize: 11, color: 'var(--ds-danger, #E33)', marginTop: 4 }, children: error }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }, children: [loading && (_jsx("span", { "aria-label": "Saving", style: {
                                    width: 12, height: 12, borderRadius: '50%',
                                    border: '2px solid var(--ds-border)',
                                    borderTopColor: 'var(--ds-accent, #888)',
                                    animation: 'ds-spin 0.6s linear infinite',
                                    display: 'inline-block',
                                } })), _jsx("input", { type: "radio", name: `${scope}-default-${item.category}`, "aria-label": `Mark ${item.name} as default for ${item.category}`, checked: isDefault, disabled: !enabled || loading || disabled, onChange: () => applyPatch(item, {
                                    scope,
                                    set_default: { category: item.category, id: item.id },
                                }) }), _jsxs("label", { className: "ds-toggle", title: enabled ? 'Disable' : 'Enable', children: [_jsx("input", { type: "checkbox", checked: enabled, disabled: loading || disabled, onChange: () => applyPatch(item, {
                                            scope,
                                            set_enabled: { id: item.id, enabled: !enabled },
                                        }) }), _jsx("span", { className: "ds-toggle-track" }), _jsx("span", { className: "ds-toggle-thumb" })] })] })] }) }, k));
    }
    function renderSection(title, items, hidden) {
        return (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { className: "ds-panel-section-title", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { children: title }), allowHide && hidden.length > 0 && (_jsx("button", { className: "ds-btn-ghost", onClick: () => setShowHidden((s) => !s), style: { fontSize: 11 }, children: showHidden ? 'Hide hidden' : `Show hidden (${hidden.length})` }))] }), items.length === 0 && hidden.length === 0 && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "None available." })), items.map(renderRow), showHidden && hidden.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', margin: '8px 0 4px' }, children: "Hidden \u2014 re-enable to surface in this scope." }), hidden.map(renderRow)] }))] }));
    }
    return (_jsxs("div", { children: [only !== 'skill' && renderSection('Available tools', grouped.tools, grouped.toolsHidden), only !== 'tool' && renderSection('Available skills', grouped.skills, grouped.skillsHidden), _jsx("div", { className: "ds-panel-section", children: _jsx("button", { className: "ds-btn-ghost", onClick: applyReset, disabled: resetting, style: { fontSize: 11.5 }, children: resetting ? 'Resetting…' : 'Reset to defaults' }) }), _jsx("style", { children: `@keyframes ds-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` })] }));
}
//# sourceMappingURL=CapabilityListPanel.js.map