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
//   ProjectSettingsPanel drops theme (Platform owns it via the shared
//   cactai-theme localStorage key) and adds a single outbound link to the
//   Platform dashboard for developer-scoped settings.
import { useState } from 'react';
export function WorkspacePanel({ projectName, githubRepoUrl, vercelDashUrl, vercelPreviewUrl, onOpenApp, syncState, onViewPendingEdits, }) {
    // Header button only renders when there are local edits to surface.
    // In the `dev · synced` state nothing needs surfacing here — the file
    // tree's per-row indicators carry the same signal at a finer grain.
    const showPendingButton = syncState.branch === 'local';
    return (_jsxs("div", { className: "ds-panel", children: [_jsxs("div", { className: "ds-panel-header", children: [_jsx("span", { className: "ds-panel-header-title", children: "Workspace" }), showPendingButton && (_jsx("button", { type: "button", className: "ds-panel-header-commit", onClick: onViewPendingEdits, children: "View pending edits" }))] }), _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Project" }), _jsxs("div", { className: "ds-card", children: [_jsx("div", { className: "ds-card-title", children: projectName }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }, children: [githubRepoUrl && (_jsx("a", { href: githubRepoUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, padding: '4px 10px' }, children: "GitHub \u2197" })), vercelDashUrl && (_jsx("a", { href: vercelDashUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, padding: '4px 10px' }, children: "Vercel \u2197" })), vercelPreviewUrl && (_jsx("button", { className: "ds-btn-primary", onClick: onOpenApp, style: { fontSize: 11.5, padding: '4px 12px' }, children: "Open app \u2197" }))] })] })] })] }));
}
export function BuildPanel({ skills, tools, onActivateSkill, onDeactivateSkill, onBuildOwn, items, loading, searchQuery, onSearch, onInstall, onUninstall, onPublish, filterKind, onFilterKind, initialTab = 'installed', }) {
    const [tab, setTab] = useState(initialTab);
    return (_jsxs("div", { className: "ds-panel", children: [_jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx("button", { className: `ds-view-btn${tab === 'installed' ? ' ds-view-active' : ''}`, onClick: () => setTab('installed'), style: { fontSize: 11.5 }, children: "Installed" }), _jsx("button", { className: `ds-view-btn${tab === 'browse' ? ' ds-view-active' : ''}`, onClick: () => setTab('browse'), style: { fontSize: 11.5 }, children: "Browse" })] }), tab === 'installed' && (_jsx(InstalledTab, { skills: skills, tools: tools, onActivateSkill: onActivateSkill, onDeactivateSkill: onDeactivateSkill, onBuildOwn: onBuildOwn, onBrowseMarketplace: () => setTab('browse') })), tab === 'browse' && (_jsx(BrowseTab, { items: items, loading: loading, searchQuery: searchQuery, onSearch: onSearch, onInstall: onInstall, onUninstall: onUninstall, onPublish: onPublish, filterKind: filterKind, onFilterKind: onFilterKind }))] }));
}
function InstalledTab({ skills, tools, onActivateSkill, onDeactivateSkill, onBuildOwn, onBrowseMarketplace, }) {
    const sourceBadgeClass = {
        configured: 'ds-badge-sdk',
        marketplace: 'ds-badge-marketplace',
        developer_written: 'ds-badge-dev',
        generated: 'ds-badge-sdk',
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Skills" }), skills.length === 0 && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No skills registered." })), skills.map(skill => (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: skill.name }), _jsx("span", { className: `ds-badge ${sourceBadgeClass[skill.source] ?? 'ds-badge-sdk'}`, children: skill.source === 'developer_written' ? 'custom' : skill.source }), skill.active && _jsx("span", { className: "ds-badge ds-badge-active", children: "active" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: skill.artifact_types.join(', ') })] }), _jsxs("label", { className: "ds-toggle", title: skill.active ? 'Deactivate' : 'Activate', children: [_jsx("input", { type: "checkbox", checked: skill.active, onChange: () => skill.active ? onDeactivateSkill(skill.skill_id) : onActivateSkill(skill.skill_id) }), _jsx("span", { className: "ds-toggle-track" }), _jsx("span", { className: "ds-toggle-thumb" })] })] }) }, skill.skill_id))), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: [_jsx("button", { className: "ds-btn-ghost", onClick: onBrowseMarketplace, style: { fontSize: 11.5 }, children: "Browse marketplace" }), _jsx("button", { className: "ds-btn-ghost", onClick: () => onBuildOwn('skill'), style: { fontSize: 11.5 }, children: "Build my own skill" })] })] }), _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Tools" }), tools.length === 0 && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No tools registered." })), tools.map(tool => (_jsx("div", { className: "ds-card", children: _jsx("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: tool.name }), _jsx("span", { className: "ds-badge ds-badge-sdk", children: tool.domain })] }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: tool.description })] }) }) }, tool.id))), _jsx("button", { className: "ds-btn-ghost", onClick: () => onBuildOwn('tool'), style: { fontSize: 11.5, marginTop: 4 }, children: "Build my own tool" })] })] }));
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
// full per-project configuration described in v1.1's hover tooltip:
// workflow, available tools, available skills, providers, credentials,
// collaborators, and the outbound link to developer settings. The four
// tabs ("Configuration", "Credentials", "Team", "Account") group related
// sections so the information density stays usable at the standard panel
// width. Each section preserves the v1.1 ds-panel-section / ds-card
// patterns so the visual rhythm matches the other rail panels.
//
// What's where:
//   - Configuration tab: WorkflowSection, CapabilityListPanel × 2 (tools
//     + skills), PersonalityPickerPanel (sub-section).
//   - Credentials tab:   ProvidersSection (renamed from "Credentials"),
//     BYOKSection.
//   - Team tab:          Collaborators (unchanged from v1.1).
//   - Account tab:       Open developer settings link, Billing link
//     (unchanged from v1.1).
//
// The CapabilityListPanel renders in scope='appshell' here. The DevShell
// preferences modal (avatar menu) renders the same component in
// scope='devshell' over the same catalogue.
import { CapabilityListPanel, } from './CapabilityListPanel.js';
import { PersonalityPickerPanel, } from './PersonalityPickerPanel.js';
import { PersonalityEditor, } from './PersonalityEditor.js';
import { WorkflowSection, } from './WorkflowSection.js';
import { BYOKSection, } from './BYOKSection.js';
export function ProjectSettingsPanel({ credentials, billingEnabled, collaborators, dashboardUrl, onSaveCredential, onInviteCollaborator, onRemoveCollaborator, capabilityCatalogue, capabilityConfig, onCapabilityPatch, personality, onPersonalityPatch, onPersonalityLoad, onPersonalitySave, onPersonalityTest, onCreatePersonality, workflow, onWorkflowPatch, byok, onBYOKPatch, marketplaceWorkflowsUrl, }) {
    const [tab, setTab] = useState('configuration');
    const [inviteEmail, setInviteEmail] = useState('');
    const [editingKey, setEditingKey] = useState(null);
    const [editingVal, setEditingVal] = useState('');
    // Personality editor surface state. When set, the editor replaces the
    // picker; closing the editor returns to the picker.
    const [editingPersonality, setEditingPersonality] = useState(null);
    const credFields = [
        { key: 'anthropic_api_key', label: 'Anthropic API key', placeholder: 'sk-ant-…' },
        { key: 'github_token', label: 'GitHub token', placeholder: 'ghp_…' },
        { key: 'vercel_api_token', label: 'Vercel API token', placeholder: 'vercel_…' },
        { key: 'supabase_url', label: 'Supabase URL', placeholder: 'https://xxx.supabase.co' },
        { key: 'stripe_secret_key', label: 'Stripe secret key', placeholder: 'sk_live_…' },
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
    const tabs = [
        { key: 'configuration', label: 'Configuration' },
        { key: 'credentials', label: 'Credentials' },
        { key: 'team', label: 'Team' },
        { key: 'account', label: 'Account' },
    ];
    return (_jsxs("div", { className: "ds-panel", children: [_jsx("div", { style: { display: 'flex', gap: 4 }, children: tabs.map((t) => (_jsx("button", { className: `ds-view-btn${tab === t.key ? ' ds-view-active' : ''}`, onClick: () => setTab(t.key), style: { fontSize: 11.5 }, children: t.label }, t.key))) }), tab === 'configuration' && (_jsxs(_Fragment, { children: [workflow && onWorkflowPatch
                        ? _jsx(WorkflowSection, { response: workflow, onPatch: onWorkflowPatch, marketplaceUrl: marketplaceWorkflowsUrl })
                        : (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Workflow" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Workflow data is loading\u2026" })] })), personality && onPersonalityPatch && (_jsx("div", { className: "ds-panel-section", children: editingPersonality && onPersonalityLoad && onPersonalitySave && onPersonalityTest
                            ? (_jsx(PersonalityEditor, { id: editingPersonality, onLoad: onPersonalityLoad, onSave: onPersonalitySave, onTest: onPersonalityTest, onClose: () => setEditingPersonality(null) }))
                            : (_jsx(PersonalityPickerPanel, { active_id: personality.active_id, available: personality.available, onConfirm: onPersonalityPatch, onOpenEditor: (id) => setEditingPersonality(id), onCreate: onCreatePersonality })) })), capabilityCatalogue && capabilityConfig && onCapabilityPatch
                        ? (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Tools and skills" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Pick which tools and skills are available in your deployed app. DevShell preferences (avatar menu) controls the same lists for the IDE." }), _jsx(CapabilityListPanel, { scope: "appshell", catalogue: capabilityCatalogue, config: capabilityConfig.appshell, allowHide: true, onPatch: onCapabilityPatch })] }))
                        : (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Tools and skills" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Catalogue is loading\u2026" })] }))] })), tab === 'credentials' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Providers" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Per-project API keys for the services your agent talks to. All values are stored encrypted on your own Supabase." }), credFields.map(({ key, label, placeholder }) => (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 500, color: 'var(--ds-text)', marginBottom: 3 }, children: label }), editingKey === key ? (_jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("input", { type: "password", value: editingVal, onChange: e => setEditingVal(e.target.value), placeholder: placeholder, autoFocus: true, style: {
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
                                                                setEditingKey(null); } }), _jsx("button", { className: "ds-btn-primary", onClick: saveEdit, style: { fontSize: 11, padding: '4px 10px' }, children: "Save" }), _jsx("button", { className: "ds-btn-ghost", onClick: () => setEditingKey(null), style: { fontSize: 11, padding: '4px 8px' }, children: "\u2715" })] })) : (_jsx("div", { style: { fontSize: 11.5, color: 'var(--ds-text-3)', fontFamily: 'var(--f-mono)' }, children: credentials[key] ? '••••••••••••' : 'Not set' }))] }), editingKey !== key && (_jsx("button", { className: "ds-btn-ghost", onClick: () => startEdit(key), style: { fontSize: 11, padding: '4px 10px', flexShrink: 0 }, children: credentials[key] ? 'Update' : 'Set' }))] }) }, key)))] }), byok && onBYOKPatch && _jsx(BYOKSection, { response: byok, onPatch: onBYOKPatch })] })), tab === 'team' && (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Collaborators" }), collaborators.map(c => (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text)', fontWeight: 500 }, children: c.display_name }), _jsxs("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', marginTop: 2 }, children: [c.email, c.github_username ? ` · @${c.github_username}` : ''] }), _jsx("div", { style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 2 }, children: c.accepted_at ? 'Active' : 'Invitation pending' })] }), _jsx("button", { className: "ds-btn-ghost", onClick: () => onRemoveCollaborator(c.id), style: { fontSize: 11, padding: '4px 10px', flexShrink: 0 }, children: "Remove" })] }) }, c.id))), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: [_jsx("input", { type: "email", value: inviteEmail, onChange: e => setInviteEmail(e.target.value), placeholder: "colleague@example.com", style: {
                                    flex: 1,
                                    background: 'var(--ds-elevated)',
                                    border: '1px solid var(--ds-border)',
                                    borderRadius: 'var(--ds-r-md)',
                                    padding: '7px 12px',
                                    color: 'var(--ds-text)',
                                    fontSize: 12.5,
                                    fontFamily: 'var(--f-ui)',
                                    outline: 'none',
                                }, onKeyDown: e => {
                                    if (e.key === 'Enter' && inviteEmail.trim()) {
                                        onInviteCollaborator(inviteEmail.trim());
                                        setInviteEmail('');
                                    }
                                } }), _jsx("button", { className: "ds-btn-primary", onClick: () => {
                                    if (inviteEmail.trim()) {
                                        onInviteCollaborator(inviteEmail.trim());
                                        setInviteEmail('');
                                    }
                                }, style: { fontSize: 11.5, flexShrink: 0 }, children: "Invite" })] })] })), tab === 'account' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Developer settings" }), _jsxs("div", { className: "ds-card", children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Theme, account, plan & billing, provider keys, and security live in the Platform dashboard." }), _jsx("a", { href: `${dashboardUrl}/settings`, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, marginTop: 6, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4 }, children: "Open developer settings \u2197" })] })] }), billingEnabled && (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Billing" }), _jsxs("div", { className: "ds-card", children: [_jsx("div", { className: "ds-card-body", children: "Billing configuration is managed from the Cactai platform dashboard." }), _jsx("a", { href: `${dashboardUrl}/settings#billing`, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, marginTop: 6, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4 }, children: "Open billing \u2197" })] })] }))] }))] }));
}
//# sourceMappingURL=index.js.map