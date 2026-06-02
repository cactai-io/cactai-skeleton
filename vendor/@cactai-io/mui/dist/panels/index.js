'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/panels/index.tsx
// All DevShell rail panel components.
// Each panel is a self-contained component rendered in the main content area
// when its rail icon is active.
//
// Panels receive data via props and call callbacks for mutations.
// All API calls go through CactaiClient — panels never call fetch directly.
// Styling via ds- classes from DevShellStyles.
// Consumes theme via CSS custom properties from @cactai-io/brand-tokens.
//
// v1.1 IA layout (Surface 2):
//   Rail order: Workspace, Build, Schema, Project settings (4 sections).
//   Files is no longer a rail section — it lives as an always-on collapsible
//   bottom panel in Dev view, owned by the shell.
//   BuildPanel replaces the old Capabilities + Marketplace pair with one
//   panel exposing Installed | Browse tabs.
//   WorkspacePanel drops sprint summary (now lives only in Plan view).
//   AppConfigurationPanel drops theme (Platform owns it via the shared
//   cactai-theme localStorage key) and adds a single outbound link to the
//   Platform dashboard for developer-scoped settings.
import { useState } from 'react';
import { AuthoringInterface } from '../authoring/AuthoringInterface.js';
export function WorkspacePanel({ projectName, githubRepoUrl, vercelDashUrl, vercelPreviewUrl, onOpenApp, syncState, onViewPendingEdits, onOpenGuide, updateStatus, onOpenUpdate, }) {
    // Header button only renders when there are local edits to surface.
    // In the `dev · synced` state nothing needs surfacing here — the file
    // tree's per-row indicators carry the same signal at a finer grain.
    const showPendingButton = syncState.branch === 'local';
    return (_jsxs("div", { className: "ds-panel", children: [_jsxs("div", { className: "ds-panel-header", children: [_jsx("span", { className: "ds-panel-header-title", children: "Workspace" }), _jsxs("div", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [updateStatus?.has_update && onOpenUpdate && (_jsx("button", { type: "button", onClick: onOpenUpdate, title: "Apply the latest Cactai platform update", style: {
                                    background: 'color-mix(in srgb, var(--c-accent, #5fb6ff) 14%, transparent)',
                                    color: 'var(--c-accent, #5fb6ff)',
                                    border: '1px solid color-mix(in srgb, var(--c-accent, #5fb6ff) 40%, transparent)',
                                    borderRadius: 999,
                                    padding: '3px 10px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    letterSpacing: '0.02em',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }, children: "\u21BB Updates available" })), showPendingButton && (_jsx("button", { type: "button", className: "ds-panel-header-commit", onClick: onViewPendingEdits, children: "View pending edits" }))] })] }), _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Project" }), _jsxs("div", { className: "ds-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { className: "ds-card-title", style: { flex: 1 }, children: projectName }), onOpenGuide && (_jsx("button", { onClick: onOpenGuide, "aria-label": "Open DevShell guide", title: "DevShell guide", style: {
                                            background: 'transparent',
                                            border: '1px solid var(--ds-border-soft, rgba(255,255,255,0.12))',
                                            borderRadius: 10,
                                            color: 'var(--ds-text-2)',
                                            cursor: 'pointer',
                                            width: 20, height: 20,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 11, fontWeight: 600,
                                            fontStyle: 'italic',
                                            fontFamily: 'serif',
                                            padding: 0,
                                        }, children: "i" }))] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }, children: [githubRepoUrl && (_jsx("a", { href: githubRepoUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, padding: '4px 10px' }, children: "GitHub \u2197" })), vercelDashUrl && (_jsx("a", { href: vercelDashUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, padding: '4px 10px' }, children: "Vercel \u2197" })), vercelPreviewUrl && (_jsx("button", { className: "ds-btn-primary", onClick: onOpenApp, style: { fontSize: 11.5, padding: '4px 12px' }, children: "Open app \u2197" }))] })] })] })] }));
}
export function BuildPanel({ skills, tools, onActivateSkill, onDeactivateSkill, onBuildOwn, items, loading, searchQuery, onSearch, onInstall, onUninstall, onPublish, filterKind, onFilterKind, initialTab = 'installed', }) {
    const marketplaceAvailable = items !== undefined;
    const [tab, setTab] = useState(initialTab);
    // Authoring surface — when set, the panel shows the authoring interface for
    // that artifact type (UI/UX; the AI-assist buttons + Save are not wired yet).
    const [authoring, setAuthoring] = useState(null);
    const AUTHOR_TYPES = [
        { key: 'tool', label: 'Tool' },
        { key: 'skill', label: 'Skill' },
        { key: 'agent', label: 'Agent' },
        { key: 'personality', label: 'Personality' },
        { key: 'character', label: 'Character' },
    ];
    if (authoring) {
        return (_jsx("div", { className: "ds-panel", children: _jsx(AuthoringInterface, { type: authoring, onCancel: () => setAuthoring(null) }) }));
    }
    return (_jsxs("div", { className: "ds-panel", children: [_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Create new" }), _jsx("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: AUTHOR_TYPES.map(t => (_jsxs("button", { className: "ds-btn-ghost", onClick: () => setAuthoring(t.key), style: { fontSize: 11.5, padding: '4px 12px' }, children: ["+ ", t.label] }, t.key))) })] }), marketplaceAvailable && (_jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx("button", { className: `ds-view-btn${tab === 'installed' ? ' ds-view-active' : ''}`, onClick: () => setTab('installed'), style: { fontSize: 11.5 }, children: "Installed" }), _jsx("button", { className: `ds-view-btn${tab === 'browse' ? ' ds-view-active' : ''}`, onClick: () => setTab('browse'), style: { fontSize: 11.5 }, children: "Browse" })] })), (tab === 'installed' || !marketplaceAvailable) && (_jsx(InstalledTab, { skills: skills, tools: tools, onActivateSkill: onActivateSkill, onDeactivateSkill: onDeactivateSkill, onBuildOwn: onBuildOwn, onBrowseMarketplace: marketplaceAvailable ? () => setTab('browse') : undefined })), marketplaceAvailable && tab === 'browse' && (_jsx(BrowseTab, { items: items, loading: loading ?? false, searchQuery: searchQuery ?? '', onSearch: onSearch ?? (() => undefined), onInstall: onInstall ?? (() => undefined), onUninstall: onUninstall ?? (() => undefined), onPublish: onPublish ?? (() => undefined), filterKind: filterKind ?? 'all', onFilterKind: onFilterKind ?? (() => undefined) }))] }));
}
function InstalledTab({ skills, tools, onActivateSkill, onDeactivateSkill, onBuildOwn, onBrowseMarketplace, }) {
    const sourceBadgeClass = {
        configured: 'ds-badge-sdk',
        marketplace: 'ds-badge-marketplace',
        developer_written: 'ds-badge-dev',
        generated: 'ds-badge-sdk',
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Skills" }), skills.length === 0 && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No skills registered." })), skills.map(skill => (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: skill.name }), _jsx("span", { className: `ds-badge ${sourceBadgeClass[skill.source] ?? 'ds-badge-sdk'}`, children: skill.source === 'developer_written' ? 'custom' : skill.source }), skill.active && _jsx("span", { className: "ds-badge ds-badge-active", children: "active" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: skill.artifact_types.join(', ') })] }), _jsxs("label", { className: "ds-toggle", title: skill.active ? 'Deactivate' : 'Activate', children: [_jsx("input", { type: "checkbox", checked: skill.active, onChange: () => skill.active ? onDeactivateSkill(skill.skill_id) : onActivateSkill(skill.skill_id) }), _jsx("span", { className: "ds-toggle-track" }), _jsx("span", { className: "ds-toggle-thumb" })] })] }) }, skill.skill_id))), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: [onBrowseMarketplace && (_jsx("button", { className: "ds-btn-ghost", onClick: onBrowseMarketplace, style: { fontSize: 11.5 }, children: "Browse marketplace" })), _jsx("button", { className: "ds-btn-ghost", onClick: () => onBuildOwn('skill'), style: { fontSize: 11.5 }, children: "Build my own skill" })] })] }), _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Tools" }), tools.length === 0 && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No tools registered." })), tools.map(tool => (_jsx("div", { className: "ds-card", children: _jsx("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: tool.name }), _jsx("span", { className: "ds-badge ds-badge-sdk", children: tool.domain })] }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: tool.description })] }) }) }, tool.id))), _jsx("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: _jsx("button", { className: "ds-btn-ghost", onClick: () => onBuildOwn('tool'), style: { fontSize: 11.5 }, children: "Build my own tool" }) })] })] }));
}
function BrowseTab({ items, loading, searchQuery, onSearch, onInstall, onUninstall, onPublish, filterKind, onFilterKind, }) {
    const kinds = [
        { key: 'all', label: 'All' },
        { key: 'skill', label: 'Skills' },
        { key: 'tool', label: 'Tools' },
        { key: 'personality', label: 'Personalities' },
    ];
    const filtered = filterKind === 'all' ? items : items.filter(i => i.kind === filterKind);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("input", { type: "text", value: searchQuery, onChange: e => onSearch(e.target.value), placeholder: "Search marketplace\u2026", style: {
                            flex: 1,
                            background: 'var(--ds-elevated)',
                            border: '1px solid var(--ds-border)',
                            borderRadius: 'var(--ds-r-md)',
                            padding: '7px 12px',
                            color: 'var(--ds-text)',
                            fontSize: 12.5,
                            fontFamily: 'var(--f-ui)',
                            outline: 'none',
                        } }), _jsx("a", { className: "ds-btn-ghost", href: "https://marketplace.cactai.io", target: "_blank", rel: "noopener noreferrer", style: { fontSize: 11.5, flexShrink: 0, textDecoration: 'none', lineHeight: '1.7' }, title: "Open the full marketplace in a new tab (signed in via cactai.io)", children: "Open \u2197" }), _jsx("button", { className: "ds-btn-ghost", onClick: onPublish, style: { fontSize: 11.5, flexShrink: 0 }, children: "Publish \u2191" })] }), _jsx("div", { style: { display: 'flex', gap: 4 }, children: kinds.map(k => (_jsx("button", { className: `ds-view-btn${filterKind === k.key ? ' ds-view-active' : ''}`, onClick: () => onFilterKind(k.key), style: { fontSize: 11 }, children: k.label }, k.key))) }), _jsxs("div", { className: "ds-panel-section", style: { flex: 1, minHeight: 0, overflowY: 'auto' }, children: [loading && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "Loading\u2026" })), !loading && filtered.length === 0 && (_jsxs("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: ["No results", searchQuery ? ` for "${searchQuery}"` : '', "."] })), !loading && filtered.map(item => (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: item.display_name }), _jsx("span", { className: `ds-badge ${item.kind === 'skill' ? 'ds-badge-sdk' : item.kind === 'tool' ? 'ds-badge-marketplace' : 'ds-badge-dev'}`, children: item.kind })] }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: item.description }), _jsxs("div", { style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 4 }, children: ["by ", item.author, " \u00B7 v", item.semver, " \u00B7 ", item.price_cents === 0 ? 'free' : `$${(item.price_cents / 100).toFixed(2)}`] })] }), _jsx("button", { className: item.installed ? 'ds-btn-ghost' : 'ds-btn-primary', onClick: () => item.installed ? onUninstall(item.id) : onInstall(item.id), style: { fontSize: 11, padding: '5px 12px', flexShrink: 0 }, children: item.installed ? 'Uninstall' : 'Install' })] }) }, item.id)))] })] }));
}
export function SchemaPanel({ tables, migrations, onAddTable, onEditTable, supabaseProjectUrl }) {
    const [expanded, setExpanded] = useState(null);
    return (_jsxs("div", { className: "ds-panel", children: [_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { className: "ds-panel-section-title", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { children: "Tables" }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [supabaseProjectUrl && (_jsx("a", { className: "ds-btn-ghost", href: supabaseProjectUrl, target: "_blank", rel: "noopener noreferrer", style: { fontSize: 11, padding: '3px 10px', textDecoration: 'none', lineHeight: '1.6' }, title: "Open this project's Table Editor in Supabase", children: "Open in Supabase \u2197" })), onAddTable && (_jsx("button", { className: "ds-btn-ghost", onClick: onAddTable, style: { fontSize: 11, padding: '3px 10px' }, children: "+ Add table" }))] })] }), tables.length === 0 && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No tables yet. Describe your data model in chat to get started." })), tables.map(table => (_jsxs("div", { className: "ds-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }, onClick: () => setExpanded(expanded === table.name ? null : table.name), children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5, flex: 1 }, children: table.name }), table.rls_enabled && _jsx("span", { className: "ds-badge ds-badge-active", style: { fontSize: 9 }, children: "RLS" }), table.row_count !== undefined && (_jsxs("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: [table.row_count, " rows"] })), _jsx("span", { style: { color: 'var(--ds-text-3)', fontSize: 10 }, children: expanded === table.name ? '▾' : '▸' })] }), expanded === table.name && (_jsxs("div", { style: { marginTop: 10 }, children: [_jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { color: 'var(--ds-text-3)' }, children: [_jsx("th", { style: { textAlign: 'left', padding: '4px 0', fontWeight: 500 }, children: "Field" }), _jsx("th", { style: { textAlign: 'left', padding: '4px 8px', fontWeight: 500 }, children: "Type" }), _jsx("th", { style: { textAlign: 'left', padding: '4px 0', fontWeight: 500 }, children: "Nullable" })] }) }), _jsx("tbody", { children: table.fields.map(field => (_jsxs("tr", { style: { borderTop: '1px solid var(--ds-border-soft)' }, children: [_jsxs("td", { style: { padding: '5px 0', color: field.primary ? 'var(--ds-orange)' : 'var(--ds-text)', fontFamily: 'var(--f-mono)', fontSize: 11 }, children: [field.name, field.primary ? ' 🔑' : ''] }), _jsx("td", { style: { padding: '5px 8px', color: 'var(--ds-purple)', fontFamily: 'var(--f-mono)', fontSize: 11 }, children: field.type }), _jsx("td", { style: { padding: '5px 0', color: 'var(--ds-text-3)', fontSize: 10 }, children: field.nullable ? 'null' : 'not null' })] }, field.name))) })] }), onEditTable && (_jsx("button", { className: "ds-btn-ghost", onClick: () => onEditTable(table.name), style: { marginTop: 10, fontSize: 11, padding: '4px 10px' }, children: "Edit table" }))] }))] }, table.name)))] }), _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Migration history" }), migrations.length === 0 ? (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No migrations yet." })) : (migrations.map(m => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--ds-border-soft)', fontSize: 12 }, children: [_jsx("span", { style: { fontFamily: 'var(--f-mono)', flex: 1, color: 'var(--ds-text-2)' }, children: m.name }), _jsx("span", { style: { fontSize: 10, color: m.status === 'applied' ? '#28C940' : m.status === 'failed' ? 'var(--ds-red)' : 'var(--ds-orange)' }, children: m.status }), _jsx("span", { style: { fontSize: 10, color: 'var(--ds-text-3)' }, children: new Date(m.applied_at).toLocaleDateString() })] }, m.id))))] })] }));
}
// Project settings panel ("Project settings")
//
// v1.1: theme moved out. Theme is per-developer, not per-project, so the
// Platform /settings page is the single source of truth and writes the
// shared cactai-theme localStorage key. The DevShell reads the same key
// at boot and applies the resolved theme to <html data-theme>.
//
// v1.2 (Thread 08): the panel expands into a tabbed layout covering the
// per-project configuration described in v1.1's hover tooltip:
// workflow, available tools, available skills, providers, credentials.
// Each section preserves the v1.1 ds-panel-section / ds-card patterns so
// the visual rhythm matches the other rail panels.
//
// What's where:
//   - Configuration tab: WorkflowSection, CapabilityListPanel × 2 (tools
//     + skills), PersonalityPickerPanel (sub-section).
//   - Credentials tab:   ProvidersSection, BYOKSection.
//   - Integrations tab:  MCPManager (devshell-scope MCP servers).
//
// The CapabilityListPanel renders in scope='appshell' here. The DevShell
// preferences modal (avatar menu) renders the same component in
// scope='devshell' over the same catalogue.
//
// Team + Account tabs were both removed — collaborator + account
// management live on the platform dashboard. Team-tab removal also took
// the collaborators/billingEnabled props with it (no callers left).
import { CapabilityListPanel, } from './CapabilityListPanel.js';
import { PersonalityPickerPanel, } from './PersonalityPickerPanel.js';
import { PersonalityEditor, } from './PersonalityEditor.js';
import { WorkflowSection, } from './WorkflowSection.js';
import { BYOKSection, } from './BYOKSection.js';
import { MCPManager } from './MCPManager.js';
function ConfigLoading({ title }) {
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: title }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Loading\u2026" })] }));
}
// A scoped App Configuration tab whose functional build lands next. Describes
// what the tab configures so the surface is legible (and so guide content can
// be written against a known shape) before the full feature is wired.
function ConfigScoped({ title, body }) {
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: title }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, lineHeight: 1.55, color: 'var(--ds-text-2)' }, children: body })] }));
}
// Default role-sets seeded when the developer picks "use default roles". The
// Roles tab is the home to view + adjust the seeded catalog; here the defaults
// are shown as the starting structure (edit wiring lands with the functional
// build). Ranks high→low.
const DEFAULT_ROLE_SETS = [
    { id: 'multi', label: 'Multi-role (default)', roles: [
            { name: 'super_admin', rank: 3, note: 'Full control; top rank' },
            { name: 'admin', rank: 2, note: 'Manage members + settings' },
            { name: 'user', rank: 1, note: 'Standard member' },
            { name: 'viewer', rank: 0, note: 'Read-only' },
        ] },
    { id: 'single', label: 'Single-role', roles: [
            { name: 'user', rank: 0, note: 'Everyone is a user' },
        ] },
];
// Default tier structures seeded when the developer picks "use default tiers".
const DEFAULT_TIER_SETS = [
    { id: 'three', label: '3-tier (default)', tiers: ['Free', 'Pro', 'Enterprise'] },
    { id: 'single', label: 'Single tier', tiers: ['Standard'] },
];
function RolesTab() {
    const [pick, setPick] = useState(DEFAULT_ROLE_SETS[0].id);
    const set = DEFAULT_ROLE_SETS.find(s => s.id === pick) ?? DEFAULT_ROLE_SETS[0];
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Roles" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8, color: 'var(--ds-text-2)' }, children: "Your app's role catalog. Defaults are seeded during the build workflow; this is where you view and adjust them. Role DESIGN lives here \u2014 managing actual users is in the Portal." }), _jsx("div", { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }, children: DEFAULT_ROLE_SETS.map(s => (_jsx("button", { className: `ds-view-btn${pick === s.id ? ' ds-view-active' : ''}`, onClick: () => setPick(s.id), style: { fontSize: 11 }, children: s.label }, s.id))) }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: set.roles.map(r => (_jsxs("div", { className: "ds-card", style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("span", { style: { fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ds-text)', fontWeight: 600, flex: 1 }, children: r.name }), _jsxs("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: ["rank ", r.rank] }), _jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-2)', flex: 2 }, children: r.note })] }, r.name))) }), _jsx("div", { className: "ds-card-body", style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 8 }, children: "Editing (rename / rank / capabilities / \u201Ccan grant own role\u201D) wires up with the functional build." })] }));
}
function TiersTab() {
    const [pick, setPick] = useState(DEFAULT_TIER_SETS[0].id);
    const set = DEFAULT_TIER_SETS.find(s => s.id === pick) ?? DEFAULT_TIER_SETS[0];
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Tiers" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8, color: 'var(--ds-text-2)' }, children: "Pricing/access tiers, each with per-provider budgets for your Included providers. Defaults are seeded during the workflow; view and adjust them here." }), _jsx("div", { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }, children: DEFAULT_TIER_SETS.map(s => (_jsx("button", { className: `ds-view-btn${pick === s.id ? ' ds-view-active' : ''}`, onClick: () => setPick(s.id), style: { fontSize: 11 }, children: s.label }, s.id))) }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: set.tiers.map(t => (_jsxs("div", { className: "ds-card", style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--ds-text)', fontWeight: 600, flex: 1 }, children: t }), _jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: "budgets per provider \u2014 set with functional build" })] }, t))) })] }));
}
export function AppConfigurationPanel({ credentials, dashboardUrl, onSaveCredential, capabilityCatalogue, capabilityConfig, onCapabilityPatch, personality, onPersonalityPatch, onPersonalityLoad, onPersonalitySave, onPersonalityTest, onCreatePersonality, workflow, onWorkflowPatch, byok, onBYOKPatch, marketplaceWorkflowsUrl, mcpServers, mcpCatalog, mcpExplainer, mcpLoading, onMCPAdd, onMCPRemove, onMCPToggle, }) {
    const [tab, setTab] = useState('workflow');
    const [authoring, setAuthoring] = useState(null);
    const [editingKey, setEditingKey] = useState(null);
    const [editingVal, setEditingVal] = useState('');
    // Personality editor surface state. When set, the editor replaces the
    // picker; closing the editor returns to the picker.
    const [editingPersonality, setEditingPersonality] = useState(null);
    // AI tab shows ONLY runtime AI provider keys. GitHub / Vercel / Supabase are
    // infrastructure — set once at the wizard, never editable here (see
    // infrastructure-immutability). Stripe lives in the Portal's Payments section,
    // not in build-time App Configuration.
    const credFields = [
        { key: 'anthropic_api_key', label: 'Anthropic API key', placeholder: 'sk-ant-…' },
    ];
    function startEdit(key) {
        setEditingKey(key);
        setEditingVal(credentials[key] ?? '');
    }
    function saveEdit() {
        if (editingKey && editingVal.trim()) {
            onSaveCredential(editingKey, editingVal.trim());
        }
        setEditingKey(null);
        setEditingVal('');
    }
    const mcpAvailable = !!(onMCPAdd && onMCPRemove && onMCPToggle);
    const tabs = [
        { key: 'workflow', label: 'Workflow' },
        { key: 'tools', label: 'Tools' },
        { key: 'skills', label: 'Skills' },
        { key: 'ai', label: 'AI' },
        { key: 'agents', label: 'Agents' },
        { key: 'roles', label: 'Roles' },
        { key: 'tiers', label: 'Tiers' },
        { key: 'integrations', label: 'Integrations' },
        { key: 'design', label: 'Design' },
    ];
    if (authoring) {
        return (_jsx("div", { className: "ds-panel", children: _jsx(AuthoringInterface, { type: authoring, onCancel: () => setAuthoring(null) }) }));
    }
    return (_jsxs("div", { className: "ds-panel", children: [_jsx("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap' }, children: tabs.map((t) => (_jsx("button", { className: `ds-view-btn${tab === t.key ? ' ds-view-active' : ''}`, onClick: () => setTab(t.key), style: { fontSize: 11.5 }, children: t.label }, t.key))) }), tab === 'workflow' && (workflow && onWorkflowPatch
                ? _jsx(WorkflowSection, { response: workflow, onPatch: onWorkflowPatch, marketplaceUrl: marketplaceWorkflowsUrl })
                : _jsx(ConfigLoading, { title: "Workflow" })), tab === 'tools' && (capabilityCatalogue && capabilityConfig && onCapabilityPatch
                ? (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }, children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Which tools your deployed app can use. The IDE's own tools are set in DevShell Configuration." }), _jsx("button", { className: "ds-btn-ghost", onClick: () => setAuthoring('tool'), style: { fontSize: 11.5, padding: '4px 12px', flexShrink: 0 }, children: "+ Create tool" })] }), _jsx(CapabilityListPanel, { scope: "appshell", catalogue: capabilityCatalogue, config: capabilityConfig.appshell, allowHide: true, onPatch: onCapabilityPatch, only: "tool" })] }))
                : _jsx(ConfigLoading, { title: "Tools" })), tab === 'skills' && (capabilityCatalogue && capabilityConfig && onCapabilityPatch
                ? (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }, children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Which skills your deployed app offers. The IDE's own skills are set in DevShell Configuration." }), _jsx("button", { className: "ds-btn-ghost", onClick: () => setAuthoring('skill'), style: { fontSize: 11.5, padding: '4px 12px', flexShrink: 0 }, children: "+ Create skill" })] }), _jsx(CapabilityListPanel, { scope: "appshell", catalogue: capabilityCatalogue, config: capabilityConfig.appshell, allowHide: true, onPatch: onCapabilityPatch, only: "skill" })] }))
                : _jsx(ConfigLoading, { title: "Skills" })), tab === 'ai' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "AI providers" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Per-project AI provider keys, stored encrypted on your own Supabase." }), credFields.map(({ key, label, placeholder }) => (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 500, color: 'var(--ds-text)', marginBottom: 3 }, children: label }), editingKey === key ? (_jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("input", { type: "password", value: editingVal, onChange: e => setEditingVal(e.target.value), placeholder: placeholder, autoFocus: true, style: {
                                                                flex: 1,
                                                                background: 'var(--ds-canvas)',
                                                                border: '1px solid var(--ds-border)',
                                                                borderRadius: 'var(--ds-r-sm)',
                                                                padding: '4px 8px',
                                                                color: 'var(--ds-text)',
                                                                fontSize: 12,
                                                                fontFamily: 'var(--f-mono)',
                                                                outline: 'none',
                                                            }, onKeyDown: e => { if (e.key === 'Enter')
                                                                saveEdit(); if (e.key === 'Escape')
                                                                setEditingKey(null); } }), _jsx("button", { className: "ds-btn-primary", onClick: saveEdit, style: { fontSize: 11, padding: '4px 10px' }, children: "Save" }), _jsx("button", { className: "ds-btn-ghost", onClick: () => setEditingKey(null), style: { fontSize: 11, padding: '4px 8px' }, children: "\u2715" })] })) : (_jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-text-3)', fontFamily: 'var(--f-mono)' }, children: credentials[key] ? '••••••••••••' : 'Not set' }))] }), editingKey !== key && (_jsx("button", { className: "ds-btn-ghost", onClick: () => startEdit(key), style: { fontSize: 11, padding: '4px 10px', flexShrink: 0 }, children: credentials[key] ? 'Update' : 'Set' }))] }) }, key)))] }), byok && onBYOKPatch && _jsx(BYOKSection, { response: byok, onPatch: onBYOKPatch }), _jsx(ConfigScoped, { title: "Keys policy + budgets", body: "Coming next: the Included / BYOK / Hybrid keys policy with per-provider overrides, provider-native budgets + alerts, and the \u201Cuse DevShell keys for testing\u201D toggle for project members." })] })), tab === 'agents' && (_jsx(ConfigScoped, { title: "Agents", body: "See, enable, disable, add, and edit the agents that power your app. Framework first; the focused configuration pass lands next." })), tab === 'roles' && _jsx(RolesTab, {}), tab === 'tiers' && _jsx(TiersTab, {}), tab === 'integrations' && (mcpAvailable
                ? (_jsx("div", { className: "ds-panel-section", children: _jsx(MCPManager, { title: "Integrations (MCP)", explainer: mcpExplainer ?? [], catalog: mcpCatalog ?? [], servers: mcpServers ?? [], loading: mcpLoading, onAdd: onMCPAdd, onRemove: onMCPRemove, onToggle: onMCPToggle }) }))
                : _jsx(ConfigScoped, { title: "Integrations", body: "Connect Model Context Protocol (MCP) servers your app's agent can use. Available once integrations are wired for this project." })), tab === 'design' && (personality && onPersonalityPatch
                ? (_jsx("div", { className: "ds-panel-section", children: editingPersonality && onPersonalityLoad && onPersonalitySave && onPersonalityTest
                        ? (_jsx(PersonalityEditor, { id: editingPersonality, onLoad: onPersonalityLoad, onSave: onPersonalitySave, onTest: onPersonalityTest, onClose: () => setEditingPersonality(null) }))
                        : (_jsx(PersonalityPickerPanel, { active_id: personality.active_id, available: personality.available, onConfirm: onPersonalityPatch, onOpenEditor: (id) => setEditingPersonality(id), onCreate: onCreatePersonality })) }))
                : _jsx(ConfigLoading, { title: "Design" }))] }));
}
//# sourceMappingURL=index.js.map