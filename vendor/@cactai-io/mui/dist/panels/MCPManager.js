import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/mui/src/panels/MCPManager.tsx
//
// Reusable MCP (Model Context Protocol) management surface. Mounted in
// all four MCP surfaces:
//   - Platform MCP        (dashboard, account-wide)
//   - DevShell MCP        (ProjectSettingsPanel.Integrations, per-project)
//   - AppShell MCP shared (skeleton /dev/mcp, app-default)
//   - AppShell MCP personal (skeleton /manage/mcp, end-user)
//
// Presentational only — the host passes the catalog, the connected
// list, and add/remove/toggle handlers. The component owns no fetching.
//
// SPRINT-1 SCOPE (UI/UX): this surface is the visible anchor for MCP in
// each location. Connections persist via the host's handlers but are
// INERT — nothing reaches a real MCP server, no agent uses them yet.
// The functional layer (connection orchestrator + agent tool-calling +
// per-product data flows) is a later sprint. See memory:
// mcp-integration-architecture.md.
//
// Styling uses brand-tokens --c-* vars directly (not the DevShell-scoped
// --ds-* aliases) so the component renders correctly in the dashboard,
// the DevShell, and the skeleton management surface alike — every host
// loads brand-tokens. Hex fallbacks cover first paint before tokens
// resolve.
import { useState } from 'react';
const C = {
    bg2: 'var(--c-bg-2, #181610)',
    bg3: 'var(--c-bg-3, #222018)',
    surf2: 'var(--c-surface-2, #2A2820)',
    border: 'var(--c-border, rgba(255,255,255,0.08))',
    borderMed: 'var(--c-border-med, rgba(255,255,255,0.14))',
    text: 'var(--c-text, #F2EFE4)',
    text2: 'var(--c-text-2, #A09880)',
    text3: 'var(--c-text-3, #6A6355)',
    accent: 'var(--c-accent, #FF6B35)',
    radius: 'var(--r, 10px)',
    radiusSm: 'var(--r-sm, 6px)',
};
export function MCPManager({ title, explainer, catalog, servers, loading = false, onAdd, onRemove, onToggle, error = null, }) {
    const [showCustom, setShowCustom] = useState(false);
    const [busyId, setBusyId] = useState(null);
    // Custom-form state.
    const [cLabel, setCLabel] = useState('');
    const [cUrl, setCUrl] = useState('');
    const [cAuthType, setCAuthType] = useState('bearer');
    const [cToken, setCToken] = useState('');
    const [formError, setFormError] = useState(null);
    // Map of endpoint_url (lowercased) → server.id so catalog cards can
    // disconnect a previously-connected integration without having to
    // jump down to the Connected list.
    const connectedByUrl = new Map(servers.map(s => [s.endpoint_url.toLowerCase(), s.id]));
    const handleCatalogConnect = async (entry) => {
        setBusyId(entry.id);
        try {
            await onAdd({
                label: entry.label,
                endpoint_url: entry.endpoint_url,
                auth_type: entry.auth_type,
            });
        }
        finally {
            setBusyId(null);
        }
    };
    const handleCatalogDisconnect = async (entry) => {
        const serverId = connectedByUrl.get(entry.endpoint_url.toLowerCase());
        if (!serverId)
            return;
        setBusyId(entry.id);
        try {
            await onRemove(serverId);
        }
        finally {
            setBusyId(null);
        }
    };
    const handleCustomAdd = async () => {
        setFormError(null);
        if (!cLabel.trim()) {
            setFormError('Give the connection a name.');
            return;
        }
        if (!/^https:\/\//i.test(cUrl.trim())) {
            setFormError('Server URL must start with https://');
            return;
        }
        setBusyId('__custom__');
        try {
            await onAdd({
                label: cLabel.trim(),
                endpoint_url: cUrl.trim(),
                auth_type: cAuthType,
                ...(cAuthType !== 'none' && cToken ? { auth_token: cToken } : {}),
            });
            setCLabel('');
            setCUrl('');
            setCToken('');
            setCAuthType('bearer');
            setShowCustom(false);
        }
        catch (e) {
            setFormError(e.message);
        }
        finally {
            setBusyId(null);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 600, color: C.text, margin: '0 0 8px' }, children: title }), explainer.map((p, i) => (_jsx("p", { style: { fontSize: 13, lineHeight: 1.6, color: C.text2, margin: '0 0 6px' }, children: p }, i)))] }), error && (_jsx("div", { style: {
                    padding: '8px 12px', borderRadius: C.radiusSm,
                    background: 'color-mix(in srgb, var(--c-error, #FF3C77) 12%, transparent)',
                    border: `1px solid var(--c-error, #FF3C77)`, color: C.text, fontSize: 12,
                }, children: error })), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 10 }, children: "Popular integrations" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }, children: catalog.map(entry => {
                            const connected = connectedByUrl.has(entry.endpoint_url.toLowerCase());
                            const busy = busyId === entry.id;
                            return (_jsxs("div", { style: {
                                    border: `1px solid ${C.border}`, borderRadius: C.radius,
                                    background: C.bg2, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                                    position: 'relative',
                                }, children: [connected && (_jsx("span", { "aria-label": "connected", title: "Connected", style: {
                                            position: 'absolute', top: 10, right: 10,
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: 'var(--c-success, #28C940)',
                                            boxShadow: '0 0 8px var(--c-success, #28C940)',
                                        } })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 18 }, "aria-hidden": true, children: entry.glyph ?? '🔌' }), _jsx("span", { style: { fontSize: 13, fontWeight: 600, color: C.text }, children: entry.label })] }), _jsx("div", { style: { fontSize: 11.5, color: C.text3, lineHeight: 1.5, flex: 1 }, children: entry.description }), _jsx("button", { onClick: () => connected ? handleCatalogDisconnect(entry) : handleCatalogConnect(entry), disabled: busy, style: {
                                            fontSize: 12, padding: '6px 10px', borderRadius: C.radiusSm,
                                            cursor: busy ? 'wait' : 'pointer',
                                            border: `1px solid ${connected ? C.borderMed : C.borderMed}`,
                                            background: connected ? 'transparent' : C.accent,
                                            color: connected ? C.text2 : '#fff',
                                            fontWeight: 500,
                                        }, children: busy
                                            ? (connected ? 'Disconnecting…' : 'Connecting…')
                                            : (connected ? 'Disconnect' : 'Connect') })] }, entry.id));
                        }) })] }), _jsx("div", { children: !showCustom ? (_jsx("button", { onClick: () => setShowCustom(true), style: {
                        fontSize: 12.5, padding: '8px 14px', borderRadius: C.radiusSm, cursor: 'pointer',
                        border: `1px solid ${C.borderMed}`, background: C.bg2, color: C.text,
                    }, children: "+ Add a custom integration" })) : (_jsxs("div", { style: { border: `1px solid ${C.border}`, borderRadius: C.radius, background: C.bg2, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: C.text }, children: "Add a custom integration" }), _jsx("div", { style: { fontSize: 11.5, color: C.text3 }, children: "Point at any MCP server. You'll need its server URL and, if it requires auth, an access token. Get these from the tool you're connecting." }), _jsx("input", { placeholder: "Name (e.g. My Notion)", value: cLabel, onChange: e => setCLabel(e.target.value), style: inputStyle() }), _jsx("input", { placeholder: "Server URL (https://\u2026)", value: cUrl, onChange: e => setCUrl(e.target.value), style: inputStyle() }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsxs("select", { value: cAuthType, onChange: e => setCAuthType(e.target.value), style: { ...inputStyle(), flex: '0 0 140px' }, children: [_jsx("option", { value: "none", children: "No auth" }), _jsx("option", { value: "bearer", children: "Bearer token" }), _jsx("option", { value: "oauth", children: "OAuth (soon)" })] }), cAuthType !== 'none' && (_jsx("input", { placeholder: "Access token", type: "password", value: cToken, onChange: e => setCToken(e.target.value), style: { ...inputStyle(), flex: 1 } }))] }), formError && _jsx("div", { style: { fontSize: 11.5, color: 'var(--c-error, #FF3C77)' }, children: formError }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handleCustomAdd, disabled: busyId === '__custom__', style: {
                                        fontSize: 12, padding: '7px 14px', borderRadius: C.radiusSm, cursor: 'pointer',
                                        border: 'none', background: C.accent, color: '#fff', fontWeight: 500,
                                    }, children: busyId === '__custom__' ? 'Adding…' : 'Add connection' }), _jsx("button", { onClick: () => { setShowCustom(false); setFormError(null); }, style: {
                                        fontSize: 12, padding: '7px 14px', borderRadius: C.radiusSm, cursor: 'pointer',
                                        border: `1px solid ${C.borderMed}`, background: 'transparent', color: C.text2,
                                    }, children: "Cancel" })] })] })) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 10 }, children: "Connected" }), loading ? (_jsx("div", { style: { fontSize: 12.5, color: C.text3 }, children: "Loading\u2026" })) : servers.length === 0 ? (_jsx("div", { style: { fontSize: 12.5, color: C.text3 }, children: "Nothing connected yet. Pick a popular integration above or add a custom one." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: servers.map(s => (_jsxs("div", { style: {
                                border: `1px solid ${C.border}`, borderRadius: C.radius, background: C.bg2,
                                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
                            }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 500, color: C.text }, children: s.label }), _jsx("div", { style: { fontSize: 11, color: C.text3, fontFamily: 'var(--f-mono, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: s.endpoint_url }), _jsx("div", { style: { fontSize: 10.5, color: C.text3, marginTop: 2 }, children: s.auth_type === 'none' ? 'No auth' : s.auth_set ? `${s.auth_type} · token set` : `${s.auth_type} · no token` })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.text3, cursor: 'pointer' }, title: s.enabled ? 'Disable' : 'Enable', children: [_jsx("input", { type: "checkbox", checked: s.enabled, onChange: () => onToggle(s.id, !s.enabled) }), s.enabled ? 'On' : 'Off'] }), _jsx("button", { onClick: async () => { setBusyId(s.id); try {
                                        await onRemove(s.id);
                                    }
                                    finally {
                                        setBusyId(null);
                                    } }, disabled: busyId === s.id, style: {
                                        fontSize: 11.5, padding: '5px 10px', borderRadius: C.radiusSm, cursor: 'pointer',
                                        border: `1px solid ${C.borderMed}`, background: 'transparent', color: C.text2, flexShrink: 0,
                                    }, children: busyId === s.id ? '…' : 'Remove' })] }, s.id))) }))] })] }));
}
function inputStyle() {
    return {
        width: '100%',
        background: 'var(--c-bg-3, #222018)',
        border: '1px solid var(--c-border, rgba(255,255,255,0.08))',
        borderRadius: 'var(--r-sm, 6px)',
        padding: '8px 10px',
        color: 'var(--c-text, #F2EFE4)',
        fontSize: 12.5,
        fontFamily: 'var(--f-ui, system-ui, sans-serif)',
        outline: 'none',
        boxSizing: 'border-box',
    };
}
//# sourceMappingURL=MCPManager.js.map