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
import { useState, useMemo, useEffect, useRef } from 'react';
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
                                }, children: "\u21BB Updates available" })), showPendingButton && (_jsx("button", { type: "button", className: "ds-panel-header-commit", onClick: onViewPendingEdits, children: "View pending edits" }))] })] }), _jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Project" }), _jsxs("div", { className: "ds-card", children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: _jsx("div", { className: "ds-card-title", style: { flex: 1 }, children: projectName }) }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }, children: [githubRepoUrl && (_jsx("a", { href: githubRepoUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, padding: '4px 10px' }, children: "GitHub \u2197" })), vercelDashUrl && (_jsx("a", { href: vercelDashUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-btn-ghost", style: { fontSize: 11.5, padding: '4px 10px' }, children: "Vercel \u2197" })), vercelPreviewUrl && (_jsx("button", { className: "ds-btn-primary", onClick: onOpenApp, style: { fontSize: 11.5, padding: '4px 12px' }, children: "Open app \u2197" }))] })] })] })] }));
}
export function BuildPanel({ skills, tools, items, loading, searchQuery, onSearch, onInstall, onUninstall, onPublish, filterKind, onFilterKind, initialTab = 'installed', assets, onUploadAsset, onDeleteAsset, assetDownloadPath, libraryManifest, personalities, }) {
    const marketplaceAvailable = items !== undefined;
    const [tab, setTab] = useState(initialTab);
    // The Library is the catch-all content directory/index (locked 2026-06-02):
    // it surfaces everything in the app + where each item is used + its status.
    // Authoring happens in Studio; activation in Configuration. "Browse" brings
    // new content in from the marketplace.
    return (_jsxs("div", { className: "ds-panel ds-library", children: [marketplaceAvailable && (_jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx("button", { className: `ds-view-btn${tab === 'installed' ? ' ds-view-active' : ''}`, onClick: () => setTab('installed'), style: { fontSize: 11.5 }, children: "Directory" }), _jsx("button", { className: `ds-view-btn${tab === 'browse' ? ' ds-view-active' : ''}`, onClick: () => setTab('browse'), style: { fontSize: 11.5 }, children: "Browse" })] })), (tab === 'installed' || !marketplaceAvailable) && (_jsx(LibraryDirectory, { skills: skills, tools: tools, assets: assets, onUploadAsset: onUploadAsset, onDeleteAsset: onDeleteAsset, assetDownloadPath: assetDownloadPath, libraryManifest: libraryManifest, personalities: personalities, onBrowseMarketplace: marketplaceAvailable ? () => setTab('browse') : undefined })), marketplaceAvailable && tab === 'browse' && (_jsx(BrowseTab, { items: items, loading: loading ?? false, searchQuery: searchQuery ?? '', onSearch: onSearch ?? (() => undefined), onInstall: onInstall ?? (() => undefined), onUninstall: onUninstall ?? (() => undefined), onPublish: onPublish ?? (() => undefined), filterKind: filterKind ?? 'all', onFilterKind: onFilterKind ?? (() => undefined) }))] }));
}
function fmtBytes(n) {
    if (n == null)
        return '';
    if (n < 1024)
        return `${n} B`;
    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function LibraryDirectory({ skills, tools, assets, onUploadAsset, onDeleteAsset, assetDownloadPath, libraryManifest, personalities, onBrowseMarketplace }) {
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState('all');
    const [uploading, setUploading] = useState(false);
    const fileInput = useRef(null);
    const uploadsEnabled = !!onUploadAsset;
    const items = useMemo(() => {
        const s = skills.map(sk => ({
            id: `skill:${sk.skill_id}`,
            name: sk.name,
            kind: 'skill',
            origin: sk.source === 'developer_written' ? 'authored' : sk.source,
            active: sk.active,
            description: sk.artifact_types.join(', '),
            location: 'App Configuration → Skills',
        }));
        const t = tools.map(tl => ({
            id: `tool:${tl.id}`,
            name: tl.name,
            kind: 'tool',
            origin: tl.domain,
            active: tl.active,
            description: tl.description,
            location: 'App Configuration → Tools',
        }));
        const f = (assets ?? []).map(a => ({
            id: `file:${a.id}`,
            name: a.filename,
            kind: 'file',
            origin: 'uploaded',
            active: true,
            description: [a.content_type ?? 'file', fmtBytes(a.size_bytes)].filter(Boolean).join(' · '),
            location: 'Library (uploaded)',
            assetId: a.id,
            downloadHref: assetDownloadPath ? assetDownloadPath(a.id) : undefined,
        }));
        // project-library/ authored artifacts. Workflows / agents / characters are
        // net-new in the directory; authored tools/skills already surface above via
        // the registry, so here we add the three new kinds (path + load status).
        const fromManifest = (entries, k) => (entries ?? []).map(e => ({
            id: `${k}:${e.path}`,
            name: e.id || e.path.split('/').pop() || e.path,
            kind: k,
            origin: 'authored',
            active: e.status === 'ok',
            description: e.status === 'error' ? (e.error ?? 'Failed to load') : '',
            location: e.path,
        }));
        const lib = [
            ...fromManifest(libraryManifest?.workflows, 'workflow'),
            ...fromManifest(libraryManifest?.agents, 'agent'),
            ...fromManifest(libraryManifest?.characters, 'character'),
        ];
        const pers = (personalities ?? []).map(p => ({
            id: `personality:${p.id}`,
            name: p.name,
            kind: 'personality',
            origin: (p.source === 'developer_authored' || p.source === 'developer_written') ? 'authored' : 'built-in',
            active: !!p.active,
            description: p.description ?? '',
            location: 'App Configuration → Design',
        }));
        return [...s, ...t, ...f, ...lib, ...pers].sort((a, b) => a.name.localeCompare(b.name));
    }, [skills, tools, assets, assetDownloadPath, libraryManifest, personalities]);
    const q = query.trim().toLowerCase();
    const filtered = items.filter(i => (kind === 'all' || i.kind === kind) &&
        (q === '' || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)));
    const statusLabel = (i) => {
        if (i.kind === 'file')
            return 'Stored';
        if (i.kind === 'workflow' || i.kind === 'agent' || i.kind === 'character')
            return i.active ? 'Authored' : 'Invalid';
        return i.active ? 'Active' : i.origin === 'authored' ? 'Authored · not active' : 'Available · not active';
    };
    const kinds = [
        { key: 'all', label: `All (${items.length})` },
        { key: 'tool', label: 'Tools' },
        { key: 'skill', label: 'Skills' },
        ...(libraryManifest ? [
            { key: 'workflow', label: 'Workflows' },
            { key: 'agent', label: 'Agents' },
            { key: 'character', label: 'Characters' },
        ] : []),
        ...(personalities ? [{ key: 'personality', label: 'Personalities' }] : []),
        ...(uploadsEnabled ? [{ key: 'file', label: 'Files' }] : []),
    ];
    const handleFile = async (file) => {
        if (!onUploadAsset)
            return;
        setUploading(true);
        try {
            const buf = await file.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buf);
            for (let i = 0; i < bytes.length; i++)
                binary += String.fromCharCode(bytes[i]);
            const data_base64 = btoa(binary);
            await onUploadAsset({ filename: file.name, content_type: file.type || 'application/octet-stream', data_base64 });
        }
        finally {
            setUploading(false);
            if (fileInput.current)
                fileInput.current.value = '';
        }
    };
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Library" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8, color: 'var(--ds-text-2)', lineHeight: 1.5 }, children: "The catch-all directory for everything in your app \u2014 authored tools, skills, personalities, characters, agents, uploads, and generated artifacts. Each entry shows where it lives and its status, so nothing gets lost. Authoring happens in Studio; activation in Configuration \u2014 this is the index." }), _jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: "Search the library\u2026", style: { width: '100%', boxSizing: 'border-box', background: 'var(--ds-canvas)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-r-sm)', padding: '5px 9px', color: 'var(--ds-text)', fontSize: 12, outline: 'none', marginBottom: 8 } }), _jsxs("div", { style: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [kinds.map(k => (_jsx("button", { className: `ds-view-btn${kind === k.key ? ' ds-view-active' : ''}`, onClick: () => setKind(k.key), style: { fontSize: 11 }, children: k.label }, k.key))), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', gap: 6 }, children: [uploadsEnabled && (_jsxs(_Fragment, { children: [_jsx("input", { ref: fileInput, type: "file", style: { display: 'none' }, onChange: e => { const f = e.target.files?.[0]; if (f)
                                            void handleFile(f); } }), _jsx("button", { className: "ds-btn-ghost", disabled: uploading, onClick: () => fileInput.current?.click(), style: { fontSize: 11 }, children: uploading ? 'Uploading…' : '↑ Upload' })] })), onBrowseMarketplace && (_jsx("button", { className: "ds-btn-ghost", onClick: onBrowseMarketplace, style: { fontSize: 11 }, children: "Browse marketplace" }))] })] }), filtered.length === 0 && (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ds-text-3)' }, children: q !== '' ? 'Nothing matches your search.' : 'Nothing here yet.' })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: filtered.map(i => (_jsxs("div", { className: "ds-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: i.name }), _jsx("span", { className: "ds-badge ds-badge-sdk", children: i.kind }), _jsx("span", { className: "ds-badge ds-badge-dev", children: i.origin }), i.active
                                    ? _jsx("span", { className: "ds-badge ds-badge-active", children: statusLabel(i) })
                                    : _jsx("span", { className: "ds-badge", style: { background: 'transparent', border: '1px solid var(--ds-border)', color: 'var(--ds-text-3)' }, children: statusLabel(i) }), i.kind === 'file' && (_jsxs("span", { style: { marginLeft: 'auto', display: 'flex', gap: 8 }, children: [i.downloadHref && (_jsx("a", { href: i.downloadHref, className: "ds-btn-ghost", style: { fontSize: 10.5, padding: '1px 7px' }, download: true, children: "Download" })), onDeleteAsset && i.assetId && (_jsx("button", { className: "ds-btn-ghost", onClick: () => { void onDeleteAsset(i.assetId); }, style: { fontSize: 10.5, padding: '1px 7px' }, children: "Delete" }))] }))] }), i.description && _jsx("div", { className: "ds-card-body", style: { fontSize: 11 }, children: i.description }), _jsxs("div", { style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 4 }, children: ["Found in: ", i.location] })] }, i.id))) })] }));
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
import { PROVIDER_REGISTRY } from '@cactai-io/types';
import { groupAIProviders, CATEGORY_LABEL, BUDGET_UNIT } from './aiProviders.js';
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
            { name: 'super_admin', rank: 3, note: 'Full control; top rank', caps: ['manage_members', 'manage_billing', 'manage_settings', 'manage_content', 'view_content'] },
            { name: 'admin', rank: 2, note: 'Manage members + settings', caps: ['manage_members', 'manage_settings', 'manage_content', 'view_content'] },
            { name: 'user', rank: 1, note: 'Standard member', caps: ['manage_content', 'view_content'] },
            { name: 'viewer', rank: 0, note: 'Read-only', caps: ['view_content'] },
        ] },
    { id: 'single', label: 'Single-role', roles: [
            { name: 'user', rank: 0, note: 'Everyone is a user', caps: ['manage_content', 'view_content'] },
        ] },
];
// Default tier structures seeded when the developer picks "use default tiers".
const DEFAULT_TIER_SETS = [
    { id: 'three', label: '3-tier (default)', tiers: ['Free', 'Pro', 'Enterprise'] },
    { id: 'single', label: 'Single tier', tiers: ['Standard'] },
];
const GRANT_OWN_ROLE_CAP = 'grant_own_role';
function RolesTab({ roleCatalog, onRolePatch }) {
    // Live view when the customer-DB catalog is wired; otherwise the seed-
    // default preview (pre-provision / host hasn't passed the data).
    if (roleCatalog && roleCatalog.length > 0) {
        return _jsx(RolesLive, { catalog: roleCatalog, onRolePatch: onRolePatch });
    }
    return _jsx(RolesDefaultsPreview, {});
}
function RolesLive({ catalog, onRolePatch }) {
    // Optimistic local copy so edits reflect immediately while the PUT flies.
    const [roles, setRoles] = useState(() => [...catalog].sort((a, b) => b.rank - a.rank));
    const [saving, setSaving] = useState(null);
    const [addingTo, setAddingTo] = useState(null);
    const [newCap, setNewCap] = useState('');
    const topRank = Math.max(...roles.map(r => r.rank));
    const persist = async (role, patch) => {
        if (!onRolePatch)
            return;
        setSaving(role);
        try {
            await onRolePatch({ role, ...patch });
        }
        finally {
            setSaving(null);
        }
    };
    const updateCaps = (role, caps) => {
        setRoles(prev => prev.map(r => r.role === role ? { ...r, capabilities: caps } : r));
        void persist(role, { capabilities: caps });
    };
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Roles" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8, color: 'var(--ds-text-2)' }, children: "Your app's live role catalog. Edits save to your database. Role DESIGN lives here \u2014 managing actual users is in the Portal." }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: roles.map(r => {
                    const isTop = r.rank === topRank;
                    const canGrant = r.capabilities.includes(GRANT_OWN_ROLE_CAP);
                    const visibleCaps = r.capabilities.filter(c => c !== GRANT_OWN_ROLE_CAP);
                    return (_jsxs("div", { className: "ds-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("span", { style: { fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ds-text)', fontWeight: 600, flex: 1 }, children: r.role }), r.is_default && _jsx("span", { className: "ds-badge ds-badge-sdk", children: "default" }), _jsxs("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: ["rank ", r.rank] }), saving === r.role && _jsx("span", { style: { fontSize: 10.5, color: 'var(--ds-text-3)' }, children: "saving\u2026" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-2)', marginTop: 3 }, children: r.label }), _jsxs("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }, children: [visibleCaps.map(c => (_jsxs("span", { className: "ds-badge ds-badge-sdk", style: { fontFamily: 'var(--f-mono)', display: 'inline-flex', alignItems: 'center', gap: 4 }, children: [c, _jsx("button", { onClick: () => updateCaps(r.role, r.capabilities.filter(x => x !== c)), title: "Remove capability", style: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1 }, children: "\u00D7" })] }, c))), addingTo === r.role ? (_jsx("input", { value: newCap, onChange: e => setNewCap(e.target.value), autoFocus: true, placeholder: "capability_token", onKeyDown: e => {
                                            if (e.key === 'Enter' && newCap.trim()) {
                                                const tok = newCap.trim();
                                                if (!r.capabilities.includes(tok))
                                                    updateCaps(r.role, [...r.capabilities, tok]);
                                                setNewCap('');
                                                setAddingTo(null);
                                            }
                                            if (e.key === 'Escape') {
                                                setNewCap('');
                                                setAddingTo(null);
                                            }
                                        }, onBlur: () => { setNewCap(''); setAddingTo(null); }, style: { width: 140, background: 'var(--ds-canvas)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-r-sm)', padding: '2px 6px', color: 'var(--ds-text)', fontSize: 11, fontFamily: 'var(--f-mono)', outline: 'none' } })) : (_jsx("button", { className: "ds-btn-ghost", onClick: () => setAddingTo(r.role), style: { fontSize: 10.5, padding: '1px 7px' }, children: "+ add" }))] }), isTop && (_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }, title: "Lets the top role grant its own role to other members. Off by default \u2014 a deliberate privilege-escalation guard.", children: [_jsx("input", { type: "checkbox", checked: canGrant, onChange: () => updateCaps(r.role, canGrant ? r.capabilities.filter(x => x !== GRANT_OWN_ROLE_CAP) : [...r.capabilities, GRANT_OWN_ROLE_CAP]) }), _jsxs("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: ["Can grant own role to others ", _jsx("span", { style: { opacity: 0.7 }, children: "(off by default)" })] })] }))] }, r.role));
                }) })] }));
}
function RolesDefaultsPreview() {
    const [pick, setPick] = useState(DEFAULT_ROLE_SETS[0].id);
    const set = DEFAULT_ROLE_SETS.find(s => s.id === pick) ?? DEFAULT_ROLE_SETS[0];
    const topRank = Math.max(...set.roles.map(r => r.rank));
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Roles" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8, color: 'var(--ds-text-2)' }, children: "Default role catalog preview. The build workflow seeds one of these into your app; once provisioned, this tab loads and edits your live catalog. Role DESIGN lives here \u2014 managing actual users is in the Portal." }), _jsx("div", { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }, children: DEFAULT_ROLE_SETS.map(s => (_jsx("button", { className: `ds-view-btn${pick === s.id ? ' ds-view-active' : ''}`, onClick: () => setPick(s.id), style: { fontSize: 11 }, children: s.label }, s.id))) }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: set.roles.map(r => (_jsxs("div", { className: "ds-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("span", { style: { fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ds-text)', fontWeight: 600, flex: 1 }, children: r.name }), _jsxs("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: ["rank ", r.rank] }), _jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-2)', flex: 2 }, children: r.note })] }), _jsx("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }, children: r.caps.map(c => (_jsx("span", { className: "ds-badge ds-badge-sdk", style: { fontFamily: 'var(--f-mono)' }, children: c }, c))) }), r.rank === topRank && (_jsx("div", { style: { fontSize: 10.5, color: 'var(--ds-text-3)', marginTop: 8 }, children: "Top role \u2014 gains a \u201Ccan grant own role\u201D toggle once your live catalog loads." }))] }, r.name))) })] }));
}
const DEPENDENCY_CALLOUT = (_jsx("div", { className: "ds-card", style: { background: 'var(--ds-canvas)', marginBottom: 10 }, children: _jsxs("div", { style: { fontSize: 11, color: 'var(--ds-text-2)', lineHeight: 1.5 }, children: [_jsx("strong", { children: "Setup order:" }), " Included providers (AI tab) \u2192 User Roles \u2192 Tiers \u2192 budgets per tier. You can scaffold partially across tabs \u2014 nothing here hard-blocks. A provider added later auto-appears in every tier at budget 0 until you review it."] }) }));
// ── v1.4 ADD tabs ─────────────────────────────────────────────────────────
const SHARE_METHODS = [
    { k: 'email', l: 'Email' }, { k: 'link', l: 'Link' },
    { k: 'social', l: 'Social' }, { k: 'in_app', l: 'In-app' },
];
const SHARE_MODES = [
    { k: 'read_only', l: 'Read-only view' }, { k: 'copy', l: 'Static copy' },
    { k: 'hosted', l: 'Interactive hosted page' },
];
function ChipRow({ options, selected, onToggle }) {
    return (_jsx("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }, children: options.map(o => {
            const active = selected.includes(o.k);
            return (_jsx("button", { className: `ds-view-btn${active ? ' ds-view-active' : ''}`, onClick: () => onToggle(o.k), style: { fontSize: 11.5 }, children: o.l }, o.k));
        }) }));
}
function SharingTab({ config, onPatch }) {
    const [methods, setMethods] = useState(config?.methods ?? []);
    const [modes, setModes] = useState(config?.modes ?? []);
    const [what, setWhat] = useState(config?.what ?? '');
    const toggle = (arr, set, k) => set(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]);
    const save = () => void onPatch?.({ methods, modes, what });
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Sharing" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "How users share content out of your app." }), _jsx("div", { style: { fontSize: 11.5, fontWeight: 600 }, children: "Methods" }), _jsx(ChipRow, { options: SHARE_METHODS, selected: methods, onToggle: k => toggle(methods, setMethods, k) }), _jsx("div", { style: { fontSize: 11.5, fontWeight: 600, marginTop: 12 }, children: "Modes" }), _jsx(ChipRow, { options: SHARE_MODES, selected: modes, onToggle: k => toggle(modes, setModes, k) }), _jsx("div", { style: { fontSize: 11.5, fontWeight: 600, marginTop: 12 }, children: "What can be shared" }), _jsx("input", { className: "cactai-input", value: what, onChange: e => setWhat(e.target.value), placeholder: "e.g. recipes, reports, dashboards", style: { width: '100%', marginTop: 6, padding: '6px 8px', fontSize: 12 } }), onPatch && _jsx("button", { className: "ds-btn-ghost", onClick: save, style: { marginTop: 12, fontSize: 11.5, padding: '5px 14px' }, children: "Save" })] }));
}
function CollaborationTab({ config, onPatch }) {
    const [modes, setModes] = useState(config?.modes ?? ['member']);
    const [cross, setCross] = useState(config?.cross_tenant ?? false);
    const toggle = (k) => setModes(m => m.includes(k) ? m.filter(x => x !== k) : [...m, k]);
    const save = () => void onPatch?.({ modes, cross_tenant: cross });
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Collaboration" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "How users collaborate within an account." }), _jsx("div", { style: { fontSize: 11.5, fontWeight: 600 }, children: "Collaborator roles" }), _jsx(ChipRow, { options: [{ k: 'co_owner', l: 'Co-owner' }, { k: 'member', l: 'Member' }], selected: modes, onToggle: toggle }), _jsxs("label", { style: { display: 'flex', gap: 7, alignItems: 'center', fontSize: 12, marginTop: 12 }, children: [_jsx("input", { type: "checkbox", checked: cross, onChange: e => setCross(e.target.checked) }), "Allow cross-tenant sharing"] }), onPatch && _jsx("button", { className: "ds-btn-ghost", onClick: save, style: { marginTop: 12, fontSize: 11.5, padding: '5px 14px' }, children: "Save" })] }));
}
function AIActionsTab({ actions, onPatch, onOpenAuthoring }) {
    const [list, setList] = useState(actions);
    const add = () => {
        const next = [...list, { id: `action-${Date.now()}`, name: 'New action', instructions: '', model: 'sonnet' }];
        setList(next);
        void onPatch?.(next);
    };
    const patch = (id, n) => {
        const next = list.map(a => a.id === id ? { ...a, ...n } : a);
        setList(next);
        void onPatch?.(next);
    };
    const remove = (id) => { const next = list.filter(a => a.id !== id); setList(next); void onPatch?.(next); };
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsx("div", { className: "ds-panel-section-title", style: { margin: 0 }, children: "AI Actions" }), _jsx("button", { className: "ds-btn-ghost", onClick: add, style: { fontSize: 11.5, padding: '4px 12px' }, children: "+ Add action" })] }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8 }, children: "Reusable AI actions your app can run \u2014 an instruction + a model." }), list.length === 0 && _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, fontStyle: 'italic' }, children: "No actions yet." }), list.map(a => (_jsxs("div", { style: { border: '1px solid var(--ds-border, #25253A)', borderRadius: 8, padding: 10, marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("input", { className: "cactai-input", value: a.name, onChange: e => patch(a.id, { name: e.target.value }), placeholder: "Action name", style: { flex: 1, padding: '5px 8px', fontSize: 12 } }), _jsxs("select", { value: a.model, onChange: e => patch(a.id, { model: e.target.value }), style: { fontSize: 12, padding: '5px 6px' }, children: [_jsx("option", { value: "haiku", children: "Haiku" }), _jsx("option", { value: "sonnet", children: "Sonnet" }), _jsx("option", { value: "opus", children: "Opus" })] }), _jsx("button", { className: "ds-btn-ghost", onClick: () => remove(a.id), style: { fontSize: 11.5, padding: '4px 8px' }, children: "remove" })] }), _jsx("textarea", { className: "cactai-input", value: a.instructions, onChange: e => patch(a.id, { instructions: e.target.value }), placeholder: "Instructions (what this action does)\u2026", rows: 2, style: { width: '100%', marginTop: 6, padding: '6px 8px', fontSize: 12, resize: 'vertical' } })] }, a.id)))] }));
}
function TiersTab({ tiers, onTierBudgetPatch }) {
    if (tiers && tiers.length > 0) {
        return _jsx(TiersLive, { tiers: tiers, onTierBudgetPatch: onTierBudgetPatch });
    }
    return _jsx(TiersDefaultsPreview, {});
}
function TiersLive({ tiers, onTierBudgetPatch }) {
    // Budget rows are the AI text providers (the canonical Included candidates).
    // The persisted budgets map keys on provider id; an absent pair is unset.
    const aiProviders = useMemo(() => Object.values(PROVIDER_REGISTRY).filter(p => p.category === 'ai').map(p => ({ id: p.id, name: p.name })), []);
    const [draft, setDraft] = useState({});
    useEffect(() => {
        const seed = {};
        for (const t of tiers)
            for (const [pid, b] of Object.entries(t.budgets))
                if (b != null)
                    seed[`${t.tier_id}|${pid}`] = String(b);
        setDraft(seed);
    }, [tiers]);
    const k = (tier, prov) => `${tier}|${prov}`;
    const commit = (tier_id, provider_id, raw) => {
        const trimmed = raw.trim();
        const n = trimmed === '' ? null : Number(trimmed);
        void onTierBudgetPatch?.({ tier_id, provider_id, budget: n != null && Number.isFinite(n) ? n : null });
    };
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Tiers" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8, color: 'var(--ds-text-2)' }, children: "Your app's live tiers, each with per-provider budgets for your Included providers. Budget edits save to your database." }), DEPENDENCY_CALLOUT, _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: tiers.map(t => (_jsxs("div", { className: "ds-card", children: [_jsx("div", { style: { fontSize: 12, color: 'var(--ds-text)', fontWeight: 600, marginBottom: 6 }, children: t.label }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: aiProviders.map(p => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-2)', flex: 1 }, children: p.name }), _jsx("input", { type: "number", min: 0, value: draft[k(t.tier_id, p.id)] ?? '', onChange: e => setDraft(prev => ({ ...prev, [k(t.tier_id, p.id)]: e.target.value })), onBlur: e => commit(t.tier_id, p.id, e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                                            e.target.blur(); }, placeholder: "0", style: {
                                            width: 100, background: 'var(--ds-canvas)', border: '1px solid var(--ds-border)',
                                            borderRadius: 'var(--ds-r-sm)', padding: '3px 8px', color: 'var(--ds-text)',
                                            fontSize: 11, fontFamily: 'var(--f-mono)', outline: 'none',
                                        } }), _jsx("span", { style: { fontSize: 10.5, color: 'var(--ds-text-3)' }, children: "tokens / mo" })] }, p.id))) })] }, t.tier_id))) })] }));
}
function TiersDefaultsPreview() {
    const [pick, setPick] = useState(DEFAULT_TIER_SETS[0].id);
    const set = DEFAULT_TIER_SETS.find(s => s.id === pick) ?? DEFAULT_TIER_SETS[0];
    const includedExamples = Object.values(PROVIDER_REGISTRY)
        .filter(p => p.category === 'ai')
        .map(p => p.name);
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Tiers" }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 8, color: 'var(--ds-text-2)' }, children: "Default tier preview. The build workflow seeds one of these; once provisioned, this tab loads and edits your live tiers + budgets." }), DEPENDENCY_CALLOUT, _jsx("div", { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }, children: DEFAULT_TIER_SETS.map(s => (_jsx("button", { className: `ds-view-btn${pick === s.id ? ' ds-view-active' : ''}`, onClick: () => setPick(s.id), style: { fontSize: 11 }, children: s.label }, s.id))) }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: set.tiers.map(t => (_jsxs("div", { className: "ds-card", children: [_jsx("div", { style: { fontSize: 12, color: 'var(--ds-text)', fontWeight: 600, marginBottom: 6 }, children: t }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: includedExamples.map(name => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-2)', flex: 1 }, children: name }), _jsx("span", { style: { fontSize: 10.5, color: 'var(--ds-text-3)' }, children: "budget set once provisioned" })] }, name))) })] }, t))) })] }));
}
// Built-in agents that ship with every Cactai app, plus the provider-native
// coding agents the Agent SDK dispatcher routes between. This is the minimum
// "framework first" population of the Agents tab — the real list drawn from
// the platform's own agent definitions (packages/core agent + agent-sdk,
// packages/mui agent). Per-agent configuration + editing the developer's own
// agents wire up with the functional build.
const AGENT_CATALOG = [
    {
        id: 'gas_orchestrator',
        name: 'GAS Orchestration Agent',
        origin: 'platform',
        description: "Your app's conversational brain. Each turn it returns a typed decision via the model's native tool use, and the orchestration engine acts on it — it reasons, it never executes directly.",
    },
    {
        id: 'mui_agent',
        name: 'MUI Rendering Agent',
        origin: 'platform',
        description: 'Decides how every response is presented. Selects the right skill deterministically and returns a render decision; the skills do the actual rendering.',
    },
    {
        id: 'claude_agent_sdk',
        name: 'Claude Agent SDK',
        origin: 'provider',
        provider: 'Anthropic',
        description: 'Provider-native agentic coding for sprint-level work — the Claude Code preset with GitHub MCP, owning the branch lifecycle and streaming file writes.',
    },
    {
        id: 'openai_agents_sdk',
        name: 'OpenAI Agents SDK',
        origin: 'provider',
        provider: 'OpenAI',
        description: 'Provider-native agentic coding via the OpenAI Agents SDK run loop, with a sandbox and file operations. The coding dispatcher routes to this or Claude per task.',
    },
];
function AgentsTab({ onOpenAuthoring, agentConfig, onAgentToggle }) {
    // Optimistic local overrides layered over the persisted config; an agent
    // is on unless explicitly disabled (in either layer).
    const [overrides, setOverrides] = useState({});
    const isOn = (id) => (overrides[id] ?? agentConfig?.[id] ?? true) === true;
    const toggle = (id) => {
        const next = !isOn(id);
        setOverrides(prev => ({ ...prev, [id]: next }));
        void onAgentToggle?.(id, next);
    };
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }, children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5, color: 'var(--ds-text-2)', lineHeight: 1.5 }, children: "The agents that power your app. These built-ins ship with every Cactai app; author your own in Studio. Enable/disable + per-agent configuration persist with the functional build." }), _jsx("button", { className: "ds-btn-ghost", onClick: () => onOpenAuthoring?.('agent'), style: { fontSize: 11.5, padding: '4px 12px', flexShrink: 0 }, children: "+ Add agent" })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: AGENT_CATALOG.map(a => {
                    const on = isOn(a.id);
                    return (_jsx("div", { className: "ds-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12.5 }, children: a.name }), _jsx("span", { className: `ds-badge ${a.origin === 'provider' ? 'ds-badge-marketplace' : 'ds-badge-sdk'}`, children: a.origin === 'provider' ? a.provider : 'built-in' }), on && _jsx("span", { className: "ds-badge ds-badge-active", children: "active" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', lineHeight: 1.45 }, children: a.description })] }), _jsxs("label", { className: "ds-toggle", title: on ? 'Disable' : 'Enable', children: [_jsx("input", { type: "checkbox", checked: on, onChange: () => toggle(a.id) }), _jsx("span", { className: "ds-toggle-track" }), _jsx("span", { className: "ds-toggle-thumb" })] })] }) }, a.id));
                }) })] }));
}
function AIPolicyBudgets({ policy, onPatch }) {
    const grouped = useMemo(() => groupAIProviders(), []);
    const seedOverride = () => {
        const o = {};
        for (const [id, v] of Object.entries(policy?.providers ?? {}))
            o[id] = v.policy ?? 'inherit';
        return o;
    };
    const seedBudget = () => {
        const b = {};
        for (const [id, v] of Object.entries(policy?.providers ?? {}))
            if (v.budget != null)
                b[id] = String(v.budget);
        return b;
    };
    const seedTeam = () => new Set(Object.entries(policy?.providers ?? {}).filter(([, v]) => v.team_keys).map(([id]) => id));
    const [globalPolicy, setGlobalPolicy] = useState(policy?.global_policy ?? 'byok');
    const [override, setOverride] = useState(seedOverride);
    const [budget, setBudget] = useState(seedBudget);
    const [teamKeys, setTeamKeys] = useState(seedTeam);
    // Re-seed when the persisted policy changes (async arrival / optimistic
    // update from the host keeps the prop in step with edits).
    useEffect(() => {
        setGlobalPolicy(policy?.global_policy ?? 'byok');
        setOverride(seedOverride());
        setBudget(seedBudget());
        setTeamKeys(seedTeam());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [policy]);
    const effective = (id) => {
        const o = override[id] ?? 'inherit';
        return o === 'inherit' ? globalPolicy : o;
    };
    const hybrid = Object.values(override).some(o => o && o !== 'inherit');
    const setRow = (id, choice) => {
        setOverride(prev => ({ ...prev, [id]: choice }));
        void onPatch?.({ provider: { provider_id: id, policy: choice === 'inherit' ? null : choice } });
    };
    const toggleTeam = (id) => {
        const next = !teamKeys.has(id);
        setTeamKeys(prev => { const n = new Set(prev); if (next)
            n.add(id);
        else
            n.delete(id); return n; });
        void onPatch?.({ provider: { provider_id: id, team_keys: next } });
    };
    const commitBudget = (id, raw) => {
        const trimmed = raw.trim();
        const n = trimmed === '' ? null : Number(trimmed);
        void onPatch?.({ provider: { provider_id: id, budget: n != null && Number.isFinite(n) ? n : null } });
    };
    return (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { className: "ds-panel-section-title", style: { display: 'flex', alignItems: 'center', gap: 8 }, children: ["AI Providers", hybrid && _jsx("span", { className: "ds-badge ds-badge-marketplace", children: "Hybrid" })] }), _jsxs("div", { className: "ds-card-body", style: { fontSize: 11.5, marginBottom: 12, color: 'var(--ds-text-2)', lineHeight: 1.5 }, children: ["How AI provider keys are sourced for your app. ", _jsx("strong", { children: "Included" }), " = your keys power every user (you pay). ", _jsx("strong", { children: "BYOK" }), " = each end user brings their own key. Set each provider below; mixing the two flips the overall policy to ", _jsx("strong", { children: "Hybrid" }), ". Default is BYOK with nothing enabled \u2014 no surprise billing."] }), grouped.map(group => (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--ds-text-2)', margin: '4px 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: CATEGORY_LABEL[group.category] ?? group.category }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: group.providers.map(p => {
                            const eff = effective(p.id);
                            const choice = override[p.id] ?? 'inherit';
                            return (_jsxs("div", { className: "ds-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { className: "ds-card-title", style: { fontSize: 12, flex: 1, minWidth: 120 }, children: p.name }), _jsx("div", { style: { display: 'flex', gap: 3 }, children: ['inherit', 'included', 'byok'].map(c => (_jsx("button", { className: `ds-view-btn${choice === c ? ' ds-view-active' : ''}`, onClick: () => setRow(p.id, c), style: { fontSize: 10, padding: '2px 7px' }, title: c === 'inherit' ? `Follow overall policy (${globalPolicy})` : c === 'included' ? 'Your key, you pay' : 'End user brings their key', children: c === 'inherit' ? 'Default' : c === 'included' ? 'Incl' : 'BYOK' }, c))) })] }), eff === 'included' ? (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: "Budget" }), _jsx("input", { type: "number", min: 0, value: budget[p.id] ?? '', onChange: e => setBudget(prev => ({ ...prev, [p.id]: e.target.value })), onBlur: e => commitBudget(p.id, e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                                                    e.target.blur(); }, placeholder: "0", style: {
                                                    width: 110, background: 'var(--ds-canvas)', border: '1px solid var(--ds-border)',
                                                    borderRadius: 'var(--ds-r-sm)', padding: '3px 8px', color: 'var(--ds-text)',
                                                    fontSize: 11.5, fontFamily: 'var(--f-mono)', outline: 'none',
                                                } }), _jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: BUDGET_UNIT[group.category] ?? 'units / mo' })] })) : (_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }, title: "Lets project members test your BYOK app using your DevShell keys.", children: [_jsx("input", { type: "checkbox", checked: teamKeys.has(p.id), onChange: () => toggleTeam(p.id) }), _jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-3)' }, children: "Use DevShell keys for team testing" })] }))] }, p.id));
                        }) })] }, group.category)))] }));
}
export function AppConfigurationPanel({ credentials, dashboardUrl, onSaveCredential, capabilityCatalogue, capabilityConfig, onCapabilityPatch, personality, onPersonalityPatch, onPersonalityLoad, onPersonalitySave, onPersonalityTest, onCreatePersonality, workflow, onWorkflowPatch, byok, onBYOKPatch, marketplaceWorkflowsUrl, mcpServers, mcpCatalog, mcpExplainer, mcpLoading, onMCPAdd, onMCPRemove, onMCPToggle, themeInspectorSlot, onOpenAuthoring, roleCatalog, onRolePatch, agentConfig, onAgentToggle, aiPolicy, onAIPolicyPatch, tiers, onTierBudgetPatch, tabVisibility, sharingConfig, onSharingPatch, collaborationConfig, onCollaborationPatch, aiActions, onAIActionsPatch, customTabs, onAddCustomTab, }) {
    const [tab, setTab] = useState('workflow');
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
    // v1.4 — tab visibility from the wizard manifest. When tabVisibility is
    // omitted (older host / fresh app), every capability tab shows.
    const vis = tabVisibility;
    const showAI = vis?.ai ?? true;
    const showPaid = vis?.paid ?? true;
    const showSharing = vis?.sharing ?? true;
    const showCollab = vis?.collaboration ?? true;
    const tabs = [
        { key: 'workflow', label: 'Workflow' },
        { key: 'tools', label: 'Tools' },
        { key: 'skills', label: 'Skills' },
        ...(showAI ? [{ key: 'ai', label: 'Providers' }] : []),
        ...(showAI ? [{ key: 'ai_actions', label: 'AI Actions' }] : []),
        { key: 'agents', label: 'Agents' },
        { key: 'roles', label: 'Roles' },
        ...(showPaid ? [{ key: 'tiers', label: 'Accounts & Billing' }] : []),
        ...(showSharing ? [{ key: 'sharing', label: 'Sharing' }] : []),
        ...(showCollab ? [{ key: 'collaboration', label: 'Collaboration' }] : []),
        { key: 'integrations', label: 'Integrations' },
        { key: 'design', label: 'Design' },
        ...(customTabs ?? []).map(c => ({ key: `custom:${c.id}`, label: c.label })),
    ];
    return (_jsxs("div", { className: "ds-panel", children: [_jsxs("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap' }, children: [tabs.map((t) => (_jsx("button", { className: `ds-view-btn${tab === t.key ? ' ds-view-active' : ''}`, onClick: () => setTab(t.key), style: { fontSize: 11.5 }, children: t.label }, t.key))), onAddCustomTab && (_jsx("button", { className: "ds-view-btn", onClick: () => {
                            const label = typeof window !== 'undefined' ? window.prompt('Name your custom tab') : null;
                            if (label && label.trim())
                                void onAddCustomTab(label.trim());
                        }, style: { fontSize: 11.5, opacity: 0.8 }, children: "+ Custom tab" }))] }), tab === 'workflow' && (workflow && onWorkflowPatch
                ? _jsx(WorkflowSection, { response: workflow, onPatch: onWorkflowPatch, marketplaceUrl: marketplaceWorkflowsUrl })
                : _jsx(ConfigLoading, { title: "Workflow" })), tab === 'tools' && (capabilityCatalogue && capabilityConfig && onCapabilityPatch
                ? (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }, children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Which tools your deployed app can use. The IDE's own tools are set in DevShell Configuration." }), _jsx("button", { className: "ds-btn-ghost", onClick: () => onOpenAuthoring?.('tool'), style: { fontSize: 11.5, padding: '4px 12px', flexShrink: 0 }, children: "+ Create tool" })] }), _jsx(CapabilityListPanel, { scope: "appshell", catalogue: capabilityCatalogue, config: capabilityConfig.appshell, allowHide: true, onPatch: onCapabilityPatch, only: "tool" })] }))
                : _jsx(ConfigLoading, { title: "Tools" })), tab === 'skills' && (capabilityCatalogue && capabilityConfig && onCapabilityPatch
                ? (_jsxs("div", { className: "ds-panel-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }, children: [_jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Which skills your deployed app offers. The IDE's own skills are set in DevShell Configuration." }), _jsx("button", { className: "ds-btn-ghost", onClick: () => onOpenAuthoring?.('skill'), style: { fontSize: 11.5, padding: '4px 12px', flexShrink: 0 }, children: "+ Create skill" })] }), _jsx(CapabilityListPanel, { scope: "appshell", catalogue: capabilityCatalogue, config: capabilityConfig.appshell, allowHide: true, onPatch: onCapabilityPatch, only: "skill" })] }))
                : _jsx(ConfigLoading, { title: "Skills" })), tab === 'ai' && (_jsx(AIPolicyBudgets, { policy: aiPolicy, onPatch: onAIPolicyPatch })), tab === 'agents' && _jsx(AgentsTab, { onOpenAuthoring: onOpenAuthoring, agentConfig: agentConfig, onAgentToggle: onAgentToggle }), tab === 'roles' && _jsx(RolesTab, { roleCatalog: roleCatalog, onRolePatch: onRolePatch }), tab === 'tiers' && _jsx(TiersTab, { tiers: tiers, onTierBudgetPatch: onTierBudgetPatch }), tab === 'integrations' && (mcpAvailable
                ? (_jsx("div", { className: "ds-panel-section", children: _jsx(MCPManager, { title: "Integrations (MCP)", explainer: mcpExplainer ?? [], catalog: mcpCatalog ?? [], servers: mcpServers ?? [], loading: mcpLoading, onAdd: onMCPAdd, onRemove: onMCPRemove, onToggle: onMCPToggle }) }))
                : _jsx(ConfigScoped, { title: "Integrations", body: "Connect Model Context Protocol (MCP) servers your app's agent can use. Available once integrations are wired for this project." })), tab === 'sharing' && (_jsx(SharingTab, { config: sharingConfig, onPatch: onSharingPatch })), tab === 'collaboration' && (_jsx(CollaborationTab, { config: collaborationConfig, onPatch: onCollaborationPatch })), tab === 'ai_actions' && (_jsx(AIActionsTab, { actions: aiActions ?? [], onPatch: onAIActionsPatch, onOpenAuthoring: onOpenAuthoring })), typeof tab === 'string' && tab.startsWith('custom:') && (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: customTabs?.find(c => `custom:${c.id}` === tab)?.label ?? 'Custom tab' }), _jsx("div", { className: "ds-card-body", style: { fontSize: 11.5 }, children: "Compose this tab from your Library entries (images, code, authored components). Open the Library to add entries, then arrange them here." })] })), tab === 'design' && (_jsxs(_Fragment, { children: [personality && onPersonalityPatch && (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Personality" }), editingPersonality && onPersonalityLoad && onPersonalitySave && onPersonalityTest
                                ? (_jsx(PersonalityEditor, { id: editingPersonality, onLoad: onPersonalityLoad, onSave: onPersonalitySave, onTest: onPersonalityTest, onClose: () => setEditingPersonality(null) }))
                                : (_jsx(PersonalityPickerPanel, { active_id: personality.active_id, available: personality.available, onConfirm: onPersonalityPatch, onOpenEditor: (id) => setEditingPersonality(id), onCreate: onCreatePersonality }))] })), themeInspectorSlot && (_jsxs("div", { className: "ds-panel-section", children: [_jsx("div", { className: "ds-panel-section-title", children: "Theme" }), themeInspectorSlot] })), !personality && !themeInspectorSlot && _jsx(ConfigLoading, { title: "Design" })] }))] }));
}
//# sourceMappingURL=index.js.map