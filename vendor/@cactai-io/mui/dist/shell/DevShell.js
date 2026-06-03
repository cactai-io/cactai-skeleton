'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// packages/mui/src/shell/DevShell.tsx
// Developer shell — root IDE UI for dev-role sessions.
//
// Architecture:
//   - Renders as [data-cactai-shell] root. All styles scoped to that attribute.
//   - Children slot renders skeleton app route content in role-view tabs.
//   - DevShell chrome is Cactai-branded static UI — no MUI skill rendering here.
//   - MUIShell handles AI rendering inside the content area via chat/workflow.
//
// v1.1 IA layout (Surface 2):
//   Rail sections (4): Workspace, Build, Schema, Project settings.
//   Files is NOT a rail section. It is an always-on collapsible bottom panel
//   in Build view, owned by the shell. The panel's own header carries the
//   collapse / expand control; the rail no longer has a Files icon.
//   Build is the merged Capabilities + Marketplace section, rendered via
//   BuildPanel with Installed | Browse tabs.
//   Project settings is the AppConfigurationPanel — per-project credentials
//   + collaborators + link out to Platform /settings for developer-scoped
//   settings.
//
// Top bar (5 elements):
//   1. Brand + project meta (name + branch pill)
//   2. View switcher: Plan | Build (role pills no longer in the top bar)
//   3. Spacer
//   4. Preview as… picker (only rendered when availableRoles.length > 0)
//   5. Avatar menu, rightmost (theme controls, Platform dashboard link,
//      Preview-as, account settings, sign out, version)
//
// The v1.0 top-bar "Commit to dev" button has been removed entirely. Commit
// flows are now driven by the SyncIndicator (top of the Files panel) and
// the state-aware commit button in the Workspace panel header.
//
// Theme:
//   Surface-agnostic shared key 'cactai-theme'. Platform UI's /settings
//   page is the canonical writer; DevShell and the marketplace storefront
//   read the same key. Three-state: light | dark | system. System mode
//   follows prefers-color-scheme via a matchMedia listener.
import { useState, useCallback, useMemo, useRef, useEffect, } from 'react';
import { CACTAI_IDE_RELEASE_LABEL } from '@cactai-io/types';
import { StudioOverlay } from '../components/StudioOverlay.js';
import { DevChatPanel } from '../components/DevChatPanel.js';
import { FileTree } from '../components/FileTree.js';
import { WorkflowSurface } from '../workflow/index.js';
import { WorkspacePanel, BuildPanel, SchemaPanel, AppConfigurationPanel, } from '../panels/index.js';
import { DevShellPreferencesModal } from '../panels/DevShellPreferencesModal.js';
import { injectDevShellStyles } from './DevShellStyles.js';
import { ThemeInspector } from '../inspector/ThemeInspector.js';
import { AuthoringHub } from '../authoring/AuthoringHub.js';
import { bindSection, SHARED_STORAGE_KEYS } from '@cactai-io/brand-tokens';
// Canonical brand mark — three sunset-gradient rectangles. Same SVG
// used in the platform dashboard, the marketplace storefront, and
// cactai.io. Replaces the prior hand-drawn path that approximated
// this shape (different geometry, harder to keep consistent across
// surfaces as the brand evolves).
import { CactusMark } from '@cactai-io/brand-tokens/restricted';
import { SyncIndicator } from '../commit/SyncIndicator.js';
import { PendingEditsModal } from '../commit/PendingEditsModal.js';
import { CommitHistoryModal } from '../commit/CommitHistoryModal.js';
import { CommitConflictModal, CommitConflictError } from '../commit/CommitConflictModal.js';
import { DeployIndicator } from '../commit/DeployIndicator.js';
import { RoleViewBanner } from '../role/RoleViewBanner.js';
const SK = (pid, k) => `cactai_ds_${pid}_${k}`;
const rN = (pid, k, fb) => { try {
    const v = localStorage.getItem(SK(pid, k));
    return v !== null ? Number(v) : fb;
}
catch {
    return fb;
} };
const rB = (pid, k, fb) => { try {
    const v = localStorage.getItem(SK(pid, k));
    return v !== null ? v === 'true' : fb;
}
catch {
    return fb;
} };
const wS = (pid, k, v) => { try {
    localStorage.setItem(SK(pid, k), String(v));
}
catch { } };
// Startup view preference (set in DevShell preferences → Layout → Startup view).
// Global key holds the choice; 'last' resumes the per-project last-active view.
const LANDING_KEY = 'cactai_devshell_landing';
const isView = (v) => v === 'plan' || v === 'build' || v === 'test_drive';
function resolveInitialView(pid) {
    try {
        const landing = localStorage.getItem(LANDING_KEY) ?? 'build';
        if (landing === 'last') {
            const last = localStorage.getItem(SK(pid, 'last_view'));
            return isView(last) ? last : 'build';
        }
        return isView(landing) ? landing : 'build';
    }
    catch {
        return 'build';
    }
}
const SECTIONS = ['workspace', 'build', 'authoring', 'schema', 'project-settings'];
const S_LABEL = {
    workspace: 'Workspace',
    // 'build' is the stable internal section key for backwards-compat with
    // host wiring; the user-facing label is "Library" (storage closet for
    // skills + tools the developer authors or installs from the
    // marketplace, per user direction 2026-05-30).
    build: 'Library',
    // 'authoring' is the Studio — the canonical home for the built-in
    // authoring tools (tool/skill/agent/personality/character). Locked
    // 2026-06-02: authoring is NOT anchored in the Library; it gets its own
    // rail page, openable directly or deep-linked from where output is used.
    authoring: 'Studio',
    schema: 'Schema',
    'project-settings': 'Configuration',
};
// Hover-tooltip / aria-label text for the rail icons. Defaults to S_LABEL
// for any section not listed here. The Project settings entry uses a long
// descriptive tooltip so the user understands the panel's full intended
// scope (workflow, tools, skills, providers, credentials, collaborators),
// while the panel header itself stays the short "Project settings" label.
const S_TOOLTIP = {
    build: "Library — your collection of skills and tools (authored or installed).",
    authoring: "Studio — author the building blocks of your app: tools, skills, agents, personalities, and characters.",
    'project-settings': "Configuration — this app's workflow, available tools, skills, AI providers, agents, user roles, tiers, integrations, and design.",
};
const S_ICON = {
    chat: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
    workspace: 'M3 12L12 4l9 8M5 10v10h14V10',
    // Build: cube + stack (combines skills/tools + marketplace install).
    build: 'M12 2L3 7v10l9 5 9-5V7l-9-5zM3 7l9 5 9-5M12 12v10',
    // Studio: a pen-nib / author mark (Feather "edit-3").
    authoring: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    schema: 'M12 2C6.48 2 3 3.79 3 6v12c0 2.21 3.48 4 9 4s9-1.79 9-4V6c0-2.21-3.48-4-9-4zM3 11c0 1.66 3.48 3 9 3s9-1.34 9-3',
    'project-settings': 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
};
function SvgDefs() {
    // SVG <stop> reads CSS variables when supplied via the inline `style`
    // attribute (the `stopColor` attribute itself only accepts a literal
    // value). Routing through style keeps the sunset gradient bound to the
    // same brand-tokens values that drive every other surface — change
    // --g-stop-N once and every gradient in the app updates.
    return (_jsx("svg", { width: "0", height: "0", style: { position: 'absolute', pointerEvents: 'none' }, "aria-hidden": "true", children: _jsxs("defs", { children: [_jsxs("linearGradient", { id: "ds-sunset", x1: "0", y1: "0", x2: "1", y2: "1", children: [_jsx("stop", { offset: "0%", style: { stopColor: 'var(--g-stop-1)' } }), _jsx("stop", { offset: "40%", style: { stopColor: 'var(--g-stop-2)' } }), _jsx("stop", { offset: "75%", style: { stopColor: 'var(--g-stop-3)' } }), _jsx("stop", { offset: "100%", style: { stopColor: 'var(--g-stop-4)' } })] }), _jsxs("linearGradient", { id: "ds-sunset-v", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", style: { stopColor: 'var(--g-stop-1)' } }), _jsx("stop", { offset: "35%", style: { stopColor: 'var(--g-stop-2)' } }), _jsx("stop", { offset: "65%", style: { stopColor: 'var(--g-stop-3)' } }), _jsx("stop", { offset: "100%", style: { stopColor: 'var(--g-stop-4)' } })] })] }) }));
}
function RailBtn({ section, active, onClick }) {
    const tooltip = S_TOOLTIP[section] ?? S_LABEL[section];
    return (_jsx("button", { className: `ds-rail-btn${active ? ' ds-rail-active' : ''}`, onClick: onClick, title: tooltip, "aria-label": tooltip, children: _jsx("svg", { width: "19", height: "19", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: S_ICON[section] }) }) }));
}
export function DevShell({ shell, projectId, projectName, branch, syncState, pendingFiles, developerInitials, developerName, agentDisplayName, agentState, character, messages, streamingContent, availableRoles, onRoleSwitch, hasPublicSignup = false, onCommitToDev, onRevertCommit, onDiscardPendingFile, onDiscardAllPending, onCreateFile, onRenameFile, onDeleteFile, deployBearerToken, platformBaseUrl, vercelPreviewUrl, githubRepoUrl, vercelDashUrl, treeNodes, activeFilePath, fileContent, fileLoading, onFileSelect, onExitFileView, workflowStep, workflowForm, decisions, backlog, sprints, onWorkflowFormSubmit, onRevisitDecision, onResolveBacklog, onCreateBacklog, onUpdateBacklog, onDeleteBacklog, onRenameSprint, onDeleteSprint, notes, onCreateNote, onUpdateNote, onDeleteNote, workspaceProps, buildProps, skills, schemaProps, settingsProps, devshellPreferences, dashboardUrl, apiBaseUrl, studioPreviewUrl, buildSurfaceSlot, chatGuideSlot, filesGuideSlot, onOpenFileGuide, onOpenGuide, onAuthoringAssist, onAuthoringSave, onOpenPendingGuide, pendingGuideSlot, children, onSectionChange, onViewChange, }) {
    useEffect(() => { injectDevShellStyles(); }, []);
    // Body lock while the DevShell IDE is mounted. Pre-fix the browser
    // could scroll the entire page past [data-cactai-shell]'s 100vh
    // bounds — exposing white body background on all four sides
    // (visible during macOS rubber-band overscroll AND from any subtle
    // body-height drift). Adding a class scoped to /dev's lifetime
    // (a) clamps overflow on html + body, (b) disables overscroll
    // chaining so trackpad gestures don't bubble to the document.
    //
    // Other routes (/manage, /app, …) need normal page scrolling, so
    // the class is removed on unmount. A direct body-lock in
    // dev/layout.tsx would survive client-side route transitions
    // away from /dev — this useEffect cleanup pattern doesn't.
    useEffect(() => {
        if (typeof document === 'undefined')
            return;
        document.body.classList.add('cactai-shell-body-lock');
        return () => {
            document.body.classList.remove('cactai-shell-body-lock');
        };
    }, []);
    const THEME_STORAGE_KEY = SHARED_STORAGE_KEYS.theme;
    const readThemeMode = () => {
        try {
            const v = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
            if (v === 'light' || v === 'dark' || v === 'system')
                return v;
        }
        catch { /* localStorage unavailable */ }
        // No stored preference — defer to the OS via 'system'. Resolves to the
        // current prefers-color-scheme value on the first render.
        return 'system';
    };
    const [themeMode, setThemeMode] = useState(readThemeMode);
    const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
        try {
            return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        catch {
            return false;
        }
    });
    useEffect(() => {
        if (themeMode !== 'system')
            return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        // Read the CURRENT value on mount/hydration — the lazy initializer above
        // runs during SSR (window undefined → false), so without this read System
        // would stay stuck on light even when the OS is in dark mode.
        setSystemPrefersDark(mq.matches);
        const handler = (e) => setSystemPrefersDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [themeMode]);
    // Cross-surface sync: when another surface (Platform /settings or the
    // marketplace storefront) writes the shared cactai-theme key, pick up
    // the change without a reload. The 'storage' event fires only in other
    // tabs/windows on the same origin, which is the expected case (a
    // developer flipping theme in Platform on tab A while DevShell runs on
    // tab B).
    useEffect(() => {
        const handler = (e) => {
            if (e.key !== THEME_STORAGE_KEY)
                return;
            const next = e.newValue;
            if (next === 'light' || next === 'dark' || next === 'system')
                setThemeMode(next);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);
    const chooseTheme = useCallback((next) => {
        setThemeMode(next);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        }
        catch { /* ignore */ }
    }, []);
    const resolvedTheme = themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;
    const [chatW, setChatW] = useState(() => rN(projectId, 'chat_w', 340));
    const [treeH, setTreeH] = useState(() => rN(projectId, 'tree_h', 240));
    const [chatCol, setChatCol] = useState(() => rB(projectId, 'chat_col', false));
    // Files panel collapse state. Always-on in Build view, but the developer
    // can collapse it via the panel's own header. Persisted per-project so
    // the previous session's preference is preserved across reloads.
    const [treeCol, setTreeCol] = useState(() => rB(projectId, 'tree_col', false));
    // Nav rail auto-hide. When the developer enables this in DevShell
    // Preferences, the left rail collapses to 0 width and reveals on
    // mouseenter of the hover-zone (a thin invisible strip pinned to the
    // viewport's left edge) or the rail itself. The chat panel's left edge
    // grows to fill the freed space when hidden, so the user perceives the
    // chat as expanding when the nav retracts. The setting is per-developer
    // (devshell-global), not per-project, since it's a layout preference.
    // Storage key matches DevShellPreferencesModal's toggle.
    const [railAutoHide, setRailAutoHide] = useState(() => {
        if (typeof window === 'undefined')
            return false;
        return window.localStorage.getItem('cactai_devshell_rail_autohide') === '1';
    });
    const [railRevealed, setRailRevealed] = useState(false);
    // Manual rail collapse (distinct from the auto-hide preference). Persisted
    // per-project. When collapsed, the rail is replaced by a thin re-open strip
    // with a › arrow — same pattern as the collapsed chat/files tabs.
    const [railCol, setRailCol] = useState(() => rB(projectId, 'rail_col', false));
    const railHideTimerRef = useRef(null);
    // When auto-hide hides the rail (collapsed to a 6px stripe), the chat absorbs
    // the freed width (rail 60px − 6px stripe = 54px); when the rail reveals it
    // pushes back into the chat. Total rail+chat stays constant, so the main +
    // files content to the right is undisturbed.
    const RAIL_FREED = 54;
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const handler = (e) => {
            const next = !!e.detail?.value;
            setRailAutoHide(next);
            if (!next)
                setRailRevealed(false);
        };
        window.addEventListener('cactai:rail_autohide:change', handler);
        return () => window.removeEventListener('cactai:rail_autohide:change', handler);
    }, []);
    const revealRail = useCallback(() => {
        if (railHideTimerRef.current) {
            clearTimeout(railHideTimerRef.current);
            railHideTimerRef.current = null;
        }
        setRailRevealed(true);
    }, []);
    const hideRailWithDelay = useCallback(() => {
        if (railHideTimerRef.current)
            clearTimeout(railHideTimerRef.current);
        railHideTimerRef.current = setTimeout(() => {
            setRailRevealed(false);
            railHideTimerRef.current = null;
        }, 700);
    }, []);
    const [view, setView] = useState(() => resolveInitialView(projectId));
    // previewRole governs the Test Drive preview lens. null = signup lens
    // (logged-out / signup-page render), string = render-as-this-role.
    // Defaults to the lowest-rank role when entering Test Drive — the
    // Test Drive button's onClick seeds this — falls back to null when
    // no roles are defined yet.
    const [previewRole, setPreviewRole] = useState(() => availableRoles[availableRoles.length - 1]?.role ?? null);
    const [section, setSection] = useState('workspace');
    const [avatarOpen, setAvatarOpen] = useState(false);
    // Ref on the avatar menu container so an outside-click handler can
    // distinguish a click inside the menu from a click anywhere else.
    // Without this, the menu stays open after clicking outside which
    // feels broken — every other dropdown in the app closes on
    // outside click.
    const avatarMenuRef = useRef(null);
    // v1.2 Thread 06 — DevShell preferences modal (capability config in
    // scope='devshell'). Opened from the avatar menu.
    const [prefsOpen, setPrefsOpen] = useState(false);
    // Studio (authoring) rail page — which built-in authoring tool is open.
    // null shows the picker grid. Owned here (not inside AuthoringHub) so an
    // external launcher can deep-link straight to a specific tool.
    const [authoringType, setAuthoringType] = useState(null);
    const [hasUnread, setHasUnread] = useState(false);
    const [commitModal, setCommitModal] = useState({ kind: 'none' });
    const [committing, setCommitting] = useState(false);
    const [commitError, setCommitError] = useState(null);
    const [inspector, setInspector] = useState(null);
    // Derived: set of paths with uncommitted edits. Passed to FileTree so
    // modified dots and the per-file affordance share the same source of
    // truth as the SyncIndicator.
    const uncommittedPaths = useMemo(() => new Set(syncState.branch === 'local' ? syncState.uncommittedFiles : []), [syncState]);
    const cDragX = useRef(0), cDragW = useRef(0), cDragging = useRef(false);
    const tDragY = useRef(0), tDragH = useRef(0), tDragging = useRef(false);
    const prevLen = useRef(messages.length);
    useEffect(() => { wS(projectId, 'chat_w', chatW); }, [projectId, chatW]);
    useEffect(() => { wS(projectId, 'tree_h', treeH); }, [projectId, treeH]);
    useEffect(() => { wS(projectId, 'chat_col', chatCol); }, [projectId, chatCol]);
    useEffect(() => { wS(projectId, 'tree_col', treeCol); }, [projectId, treeCol]);
    useEffect(() => { wS(projectId, 'rail_col', railCol); }, [projectId, railCol]);
    // Remember the last-active view so the "Where I left off" startup pref can
    // resume it on the next DevShell mount.
    useEffect(() => { wS(projectId, 'last_view', view); }, [projectId, view]);
    useEffect(() => {
        if (chatCol && messages.length > prevLen.current)
            setHasUnread(true);
        prevLen.current = messages.length;
    }, [messages.length, chatCol]);
    // Outside-click + Escape close the avatar menu. The ref above marks
    // the menu container; clicks on its descendants don't trigger close
    // (handled by the contains() check). Capture-phase listener so a
    // descendant's stopPropagation can't break this.
    useEffect(() => {
        if (!avatarOpen)
            return;
        const onDocClick = (e) => {
            const el = avatarMenuRef.current;
            if (el && e.target instanceof Node && el.contains(e.target))
                return;
            // The avatar button itself toggles via its onClick — let that
            // handle the close so we don't double-fire and re-open.
            const target = e.target;
            if (target?.closest('.ds-avatar'))
                return;
            setAvatarOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape')
            setAvatarOpen(false); };
        document.addEventListener('mousedown', onDocClick, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [avatarOpen]);
    useEffect(() => {
        const mv = (e) => {
            if (cDragging.current)
                setChatW(Math.max(260, Math.min(560, cDragW.current + e.clientX - cDragX.current)));
            // Files panel max height: viewport height minus exactly the top
            // bar (var(--ds-header-h) = 52 px). Pre-2 fixes: hard-coded 520
            // (too short); then 80 (left an 80 px gap above the panel when
            // fully expanded). 52 lets the Files panel expand flush to the
            // bottom edge of the top bar so the developer gets the full
            // interior height for browsing/editing.
            if (tDragging.current) {
                const maxTreeH = Math.max(200, window.innerHeight - 52);
                setTreeH(Math.max(100, Math.min(maxTreeH, tDragH.current + tDragY.current - e.clientY)));
            }
        };
        const up = () => { cDragging.current = false; tDragging.current = false; };
        window.addEventListener('mousemove', mv);
        window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    }, []);
    const startChatDrag = useCallback((e) => { cDragging.current = true; cDragX.current = e.clientX; cDragW.current = chatW; e.preventDefault(); }, [chatW]);
    const startTreeDrag = useCallback((e) => { tDragging.current = true; tDragY.current = e.clientY; tDragH.current = treeH; e.preventDefault(); }, [treeH]);
    const changeView = useCallback((v) => { setPrefsOpen(false); setView(v); onViewChange?.(v); }, [onViewChange]);
    const changeSection = useCallback((s) => {
        // Any rail navigation dismisses the DevShell Configuration page so the
        // selected section's panel is visible rather than hidden behind it.
        setPrefsOpen(false);
        // Clicking the Studio rail button lands on its picker grid; deep-links
        // from external launchers go through openAuthoring instead and keep
        // their target tool.
        if (s === 'authoring')
            setAuthoringType(null);
        // The rail-section panels (Workspace / Build / Schema / Project
        // settings) render in the Build view's content slot. Plan and Test
        // Drive occupy that same slot with their own content, so a rail click
        // from those views must also switch to Build for the panel to show —
        // otherwise the button looks dead. The rail stays lit on the selected
        // section across all three views (see RailBtn active below) so it
        // behaves as consistent left-nav regardless of the active top tab.
        setSection(s);
        onSectionChange?.(s);
        setView('build');
        onViewChange?.('build');
    }, [onSectionChange, onViewChange]);
    // Open the Studio rail page with a specific authoring tool active.
    // Called both by the Studio rail button (type omitted → picker grid) and
    // by the launchers placed where a tool's output is used (Config tabs,
    // etc.), which deep-link to the tool here rather than opening it inline.
    const openAuthoring = useCallback((type = null) => {
        setPrefsOpen(false);
        setAuthoringType(type);
        setSection('authoring');
        onSectionChange?.('authoring');
        setView('build');
        onViewChange?.('build');
    }, [onSectionChange, onViewChange]);
    // Commit flow handlers. The pending-edits modal calls onCommitDev with
    // the selected paths; we run onCommitToDev, then close on success or
    // surface the error inline on failure.
    // v1.2 commit-flow rebuild: the commit-to-main confirmation modal and
    // its handlers are gone — developers merge dev to main manually in GitHub.
    const openPendingEdits = useCallback((initialSelection) => {
        setCommitError(null);
        setCommitModal({ kind: 'pending', initialSelection });
    }, []);
    const closeModals = useCallback(() => {
        if (committing)
            return; // never close while a commit is in flight
        setCommitModal({ kind: 'none' });
        setCommitError(null);
    }, [committing]);
    const handleCommitDev = useCallback(async (paths) => {
        if (paths.length === 0)
            return;
        setCommitting(true);
        setCommitError(null);
        try {
            await onCommitToDev(paths);
            setCommitModal({ kind: 'none' });
        }
        catch (err) {
            // Thread 11 — a CommitConflictError carries the per-file conflict
            // payload from /api/github/commit. The conflict modal takes
            // over; the pending-edits modal is set aside but its file set
            // is preserved (the developer can return to it via Cancel).
            if (err instanceof CommitConflictError) {
                setCommitModal({ kind: 'conflict', files: err.files, pendingPaths: paths });
                return;
            }
            setCommitError(err instanceof Error ? err.message : 'Commit to dev failed');
        }
        finally {
            setCommitting(false);
        }
    }, [onCommitToDev]);
    // Thread 11 — apply per-file resolutions and retry the commit. Files
    // marked 'keep_remote' are dropped from the path set entirely
    // (semantically: "drop my pending change for this file"). Files
    // marked 'keep_local' commit unchanged. Files marked 'manual' commit
    // the developer's edited content. The retry happens through the
    // same onCommitToDev callback with the resolution map attached so
    // the host can set `resolved: true` on the request body and pass
    // the resolved content per file.
    const handleConflictSubmit = useCallback(async (pendingPaths, resolutions) => {
        // Drop paths the developer chose to abandon (keep_remote).
        const keepers = pendingPaths.filter(p => {
            const r = resolutions.get(p);
            return r?.kind !== 'keep_remote';
        });
        if (keepers.length === 0) {
            // Nothing left to commit — close the modal; the developer
            // effectively discarded the entire commit's pending set on the
            // conflicting files. We don't touch the staging layer here; the
            // host's onDiscardPendingFile (if wired) cleans up the dropped
            // paths via the conflict UI's "keep remote" choice.
            setCommitModal({ kind: 'none' });
            return;
        }
        setCommitting(true);
        setCommitError(null);
        try {
            await onCommitToDev(keepers, { resolutions });
            setCommitModal({ kind: 'none' });
        }
        catch (err) {
            if (err instanceof CommitConflictError) {
                // Re-conflict — dev moved again. Re-open with the new file set.
                setCommitModal({ kind: 'conflict', files: err.files, pendingPaths: keepers });
                return;
            }
            // Stay open and surface the error inline; the developer can
            // adjust resolutions and retry, or cancel.
            setCommitModal(prev => prev.kind === 'conflict' ? { ...prev } : prev);
            setCommitError(err instanceof Error ? err.message : 'Commit to dev failed');
        }
        finally {
            setCommitting(false);
        }
    }, [onCommitToDev]);
    const handleConflictCancel = useCallback(() => {
        if (committing)
            return;
        // Drop the conflict; return the developer to the pending-edits
        // modal with the same file set re-selected so they can adjust
        // their edits or discard before attempting again.
        setCommitModal(prev => prev.kind === 'conflict'
            ? { kind: 'pending', initialSelection: prev.pendingPaths }
            : { kind: 'none' });
        setCommitError(null);
    }, [committing]);
    // Thread 12 — drive the host-provided revert callback. The history
    // modal owns the confirmation UI and only calls this once the
    // developer has confirmed. The shell flips into a 'reverting'
    // overlay so the user gets a clear in-flight signal; the history
    // modal's list stays visible underneath.
    const handleRevertCommit = useCallback(async (commit) => {
        if (!onRevertCommit)
            return;
        setCommitting(true);
        setCommitError(null);
        setCommitModal({ kind: 'reverting', commit });
        try {
            await onRevertCommit(commit);
            // Land back on the history modal so the new revert row is
            // visible. The modal re-fetches its first page on mount; we
            // close+reopen via a quick state cycle so its useEffect runs.
            setCommitModal({ kind: 'none' });
            setCommitModal({ kind: 'history' });
        }
        catch (err) {
            if (err instanceof CommitConflictError) {
                setCommitModal({
                    kind: 'conflict',
                    files: err.files,
                    // The revert's path set is implicit in the conflict response;
                    // we re-derive it from err.files so the conflict modal can
                    // submit resolutions back through the standard commit path.
                    pendingPaths: err.files.map(f => f.path),
                });
                return;
            }
            setCommitError(err instanceof Error ? err.message : 'Revert failed');
            setCommitModal({ kind: 'history' });
        }
        finally {
            setCommitting(false);
        }
    }, [onRevertCommit]);
    // Per-file affordance — opens the pending-edits modal with just that
    // file pre-selected. The modal still shows the full file list (the
    // developer can change their mind), but only this file starts checked.
    const handleCommitFile = useCallback((path) => {
        openPendingEdits([path]);
    }, [openPendingEdits]);
    // Open commit-history modal. Linked from the pending-edits modal footer
    // and also reachable directly from external surfaces if needed.
    const openHistory = useCallback(() => {
        setCommitError(null);
        setCommitModal({ kind: 'history' });
    }, []);
    // Per-row discard wrapper. The PendingEditsModal's per-row ✕, the file-
    // tree's right-click Restore / Discard, and the chat-side cancel path
    // all funnel through here. The host-provided onDiscardPendingFile does
    // the staging-layer work; this wrapper just keeps the path the modal
    // expects and surfaces errors inline.
    //
    // PendingEditsModal's per-row ✕ skips confirmation by spec. The
    // file-tree's right-click "Restore" calls this directly too — that
    // affordance is opt-in and the menu label makes the intent explicit.
    const handleDiscardOne = useCallback((path) => {
        if (onDiscardPendingFile)
            onDiscardPendingFile(path);
    }, [onDiscardPendingFile]);
    // Thread 12 — per-file undo confirmation. The FileTree's hover-shown
    // undo icon routes through this wrapper, which presents a
    // confirmation modal before calling onDiscardPendingFile. The
    // right-click menu still calls handleDiscardOne directly so its
    // existing UX stays unchanged.
    const [undoConfirmPath, setUndoConfirmPath] = useState(null);
    const handleUndoOneRequest = useCallback((path) => {
        if (!onDiscardPendingFile)
            return;
        setUndoConfirmPath(path);
    }, [onDiscardPendingFile]);
    const confirmUndoOne = useCallback(() => {
        const p = undoConfirmPath;
        setUndoConfirmPath(null);
        if (p && onDiscardPendingFile)
            onDiscardPendingFile(p);
    }, [undoConfirmPath, onDiscardPendingFile]);
    const cancelUndoOne = useCallback(() => setUndoConfirmPath(null), []);
    // Discard-all wrapper. Confirmation is handled inside the modal.
    const handleDiscardAll = useCallback(() => {
        if (onDiscardAllPending)
            onDiscardAllPending();
    }, [onDiscardAllPending]);
    // Role-view banner data — mapped from PendingFileSummary to the banner's
    // minimal shape (path + operation).
    const roleViewPendingFiles = useMemo(() => pendingFiles.map(p => ({ path: p.path, operation: p.operation })), [pendingFiles]);
    const handleInspect = useCallback((c) => { shell.stageInspectorContext(c); setInspector(c); }, [shell]);
    const clearInspector = useCallback(() => { shell.clearInspectorContext(); setInspector(null); }, [shell]);
    const toggleChat = useCallback(() => { setChatCol(c => !c); if (chatCol)
        setHasUnread(false); }, [chatCol]);
    const isBuild = view === 'build';
    // The rail-section panel (Workspace / Library / Schema / Project
    // settings) is the Build tab's main-window content. Plan and Test Drive
    // swap that window for the workflow surface / live preview respectively.
    // The files panel below + the rail + the chat are persistent frame
    // elements across all three tabs (no longer Build-gated).
    const showPanel = isBuild;
    function renderMainContent() {
        if (view === 'plan' || (view === 'build' && workflowStep !== 'complete')) {
            // Plan view → indigo. Build-view-during-workflow → amber (workflow is
            // part of the Build experience even before preview is live).
            const grad = view === 'plan' ? 'indigo' : 'amber';
            return (_jsx("div", { style: { ...bindSection(`${view}-view`, grad), flex: 1, overflow: 'hidden' }, children: _jsx(WorkflowSurface, { activeForm: view === 'plan' ? undefined : workflowForm, decisions: decisions, backlog: backlog, sprints: sprints, onFormSubmit: onWorkflowFormSubmit, onRevisit: onRevisitDecision, onResolveBacklog: onResolveBacklog, onCreateBacklog: onCreateBacklog, onUpdateBacklog: onUpdateBacklog, onDeleteBacklog: onDeleteBacklog, onRenameSprint: onRenameSprint, onDeleteSprint: onDeleteSprint, notes: notes, onCreateNote: onCreateNote, onUpdateNote: onUpdateNote, onDeleteNote: onDeleteNote }) }));
        }
        if (view === 'test_drive') {
            // Test Drive renders one of two preview lenses:
            //
            //   previewRole = string  → role lens. Renders the deployed app as
            //                            that role would see it. RoleViewBanner
            //                            mounts at the top of the pane and
            //                            surfaces a non-intrusive warning when
            //                            the developer is previewing a file or
            //                            page that has pending non-config code
            //                            edits — those won't show up until
            //                            commit + Vercel deploy.
            //
            //   previewRole = null    → signup lens. Renders the app's signup
            //                            screen (or the public landing surface
            //                            for apps with one) inside the chrome-
            //                            wrapped preview window — what a brand-
            //                            new visitor experiences before they
            //                            have an account.
            if (previewRole) {
                return (_jsxs("div", { style: { flex: 1, overflow: 'auto', position: 'relative' }, children: [_jsx(RoleViewBanner, { projectId: projectId, pendingFiles: roleViewPendingFiles, activeRoleViewPath: activeFilePath }), _jsx(StudioOverlay, { skill_id: "shell_root", onInspect: handleInspect, active: false, children: _jsx("div", { "data-appshell-preview": true, style: { height: '100%' }, children: children ?? _jsx("div", { className: "ds-preview-empty", children: _jsxs("span", { children: ["Test Drive \u00B7 ", previewRole] }) }) }) })] }));
            }
            return (_jsx("div", { style: { ...bindSection('build-view', 'amber'), flex: 1, overflow: 'hidden' }, className: "ds-preview-wrap", children: _jsxs("div", { className: "ds-preview-window", children: [_jsxs("div", { className: "ds-preview-chrome", children: [_jsxs("div", { className: "ds-traffic", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsx("div", { className: "ds-preview-url ds-mono", children: vercelPreviewUrl ? vercelPreviewUrl.replace(/^https?:\/\//, '') : `${projectName}.vercel.app` }), vercelPreviewUrl && _jsx("a", { href: vercelPreviewUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-preview-open", children: "Open \u2197" })] }), _jsx("div", { className: "ds-preview-content", children: _jsx("div", { "data-appshell-preview": true, style: { height: '100%' }, children: children ?? _jsx("div", { className: "ds-preview-empty", children: vercelPreviewUrl ? _jsx("a", { href: vercelPreviewUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-preview-link", children: "Open preview \u2197" }) : 'Commit to dev to see preview.' }) }) })] }) }));
        }
        // Build view post-workflow. Renders the buildSurfaceSlot — typically
        // a <PrimitiveTreeRenderer> the host (SelfDrivenDevShell) composed
        // with the orchestrator-emitted tree + its postEvent handler. This
        // covers the six orchestrator-side surfaces (purpose_capture,
        // purpose_confirm, purpose_clarify, stage_step with its 24
        // specialized renderers, build_approval, build_progress) without
        // mui taking a primitives-package dependency.
        //
        // When the slot is null/empty (no orchestrator-driven surface
        // active), the area stays empty — the live app preview lives in
        // Test Drive, never in Build view. The amber accent + build-view
        // section attribute stay so the gradient + accent vars match the
        // workflow phase variant.
        return (_jsx("div", { style: { ...bindSection('build-view', 'amber'), flex: 1, overflow: 'auto' }, children: buildSurfaceSlot }));
    }
    function renderPanel() {
        // Section accent allocations. v1.1 reduces to four panels and reuses
        // the gradient slots accordingly: Workspace keeps ember; Build (the
        // merged Capabilities + Marketplace) inherits coral; Schema keeps
        // cyan-teal; Project settings keeps violet. Rose (the old Marketplace
        // accent) is freed for future use.
        const panelGradient = {
            workspace: 'ember',
            build: 'coral',
            // Studio takes 'rose' — the accent freed when Marketplace merged
            // into the Library.
            authoring: 'rose',
            schema: 'cyan-teal',
            'project-settings': 'violet',
        };
        const grad = panelGradient[section];
        // The wrapper div sits between .ds-content and the panel. It must be
        // a flex column with flex: 1 + min-height: 0 so the panel inside
        // (which is also flex: 1 + min-height: 0 + overflow-y: auto)
        // resolves to a bounded height — otherwise the panel grows with
        // content and the overflow-y: auto never engages. Pre-fix this
        // wrapper was a bare <div> with only the bindSection CSS variables,
        // which is why all the panel-scroll fixes against .ds-content +
        // .ds-right-area + .ds-panel still didn't make Schema / Project
        // settings / etc. scroll: the chain broke at this one un-styled
        // intermediate.
        // Per-section ⓘ guide surface. Workspace has its own header ⓘ already;
        // the other rail panels get a corner ⓘ that opens their right-origin guide.
        const guideSurface = {
            build: 'library',
            authoring: 'studio',
            schema: 'schema',
            'project-settings': 'configuration',
        };
        const wrap = (node) => {
            const gs = guideSurface[section];
            return (_jsxs("div", { style: {
                    ...bindSection(`${section}-panel`, grad),
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }, children: [gs && onOpenGuide && (_jsx("button", { type: "button", className: "ds-btn-ghost ds-panel-guide-btn", "aria-label": `${S_LABEL[section]} guide`, title: `${S_LABEL[section]} guide`, onClick: () => onOpenGuide(gs), style: { position: 'absolute', top: 6, right: 10, zIndex: 5, fontSize: 13, lineHeight: 1, padding: '2px 7px', borderRadius: '50%' }, children: "\u24D8" })), node] }));
        };
        switch (section) {
            case 'workspace':
                return wrap(_jsx(WorkspacePanel, { ...workspaceProps, projectName: projectName, githubRepoUrl: githubRepoUrl, vercelDashUrl: vercelDashUrl, vercelPreviewUrl: vercelPreviewUrl, syncState: syncState, onViewPendingEdits: () => openPendingEdits() }));
            case 'build':
                return wrap(_jsx(BuildPanel, { ...buildProps, skills: skills }));
            case 'authoring':
                return wrap(_jsx(AuthoringHub, { activeType: authoringType, onSelectType: setAuthoringType, onBack: () => setAuthoringType(null), onAssist: onAuthoringAssist, onSave: onAuthoringSave }));
            case 'schema':
                return wrap(_jsx(SchemaPanel, { ...schemaProps }));
            case 'project-settings':
                return wrap(_jsx(AppConfigurationPanel, { ...settingsProps, dashboardUrl: dashboardUrl, onOpenAuthoring: openAuthoring, themeInspectorSlot: _jsx(ThemeInspector, { projectId: projectId, apiBaseUrl: apiBaseUrl, previewUrl: studioPreviewUrl, onClose: () => { } }) }));
            default:
                return null;
        }
    }
    // DevShell Configuration as a full-page main-area view (not a modal).
    // Triggered from the avatar menu; takes over the workspace content area
    // and returns via its own Back affordance or any rail/view navigation.
    function renderPrefsPage() {
        if (devshellPreferences) {
            return (_jsx(DevShellPreferencesModal, { variant: "page", catalogue: devshellPreferences.catalogue, config: devshellPreferences.config, onPatch: devshellPreferences.onPatch, mcp: devshellPreferences.mcp, byok: devshellPreferences.byok, onBYOKPatch: devshellPreferences.onBYOKPatch, onClose: () => setPrefsOpen(false) }));
        }
        // Page-styled stub when the host hasn't wired the prefs data yet.
        return (_jsxs("div", { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--ds-elevated)' }, children: [_jsxs("div", { style: {
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderBottom: '1px solid var(--ds-border)',
                    }, children: [_jsx("div", { style: { fontSize: 13.5, fontWeight: 500, color: 'var(--ds-text)' }, children: "DevShell Configuration" }), _jsx("button", { className: "ds-btn-ghost", onClick: () => setPrefsOpen(false), style: { fontSize: 11.5, padding: '2px 10px' }, children: "\u2190 Back" })] }), _jsx("div", { style: { padding: 16, fontSize: 12, color: 'var(--ds-text-3)' }, children: "Configuration data is loading\u2026" })] }));
    }
    // Theme tri-state buttons rendered inside the avatar menu. Kept inline
    // (rather than as a separate component) so the menu remains a single
    // place that owns its layout.
    const themeBtn = (mode, label) => (_jsx("button", { className: `ds-avatar-theme-btn${themeMode === mode ? ' ds-avatar-theme-btn-active' : ''}`, onClick: () => chooseTheme(mode), "aria-pressed": themeMode === mode, children: label }, mode));
    return (_jsxs("div", { "data-cactai-shell": true, "data-theme": resolvedTheme, "data-color-scheme": resolvedTheme, children: [_jsx(SvgDefs, {}), _jsxs("header", { className: "ds-topbar", children: [_jsxs("div", { className: "ds-brand", children: [_jsx(CactusMark, { size: 22, className: "ds-brand-mark" }), "Cactai"] }), _jsxs("div", { className: "ds-project-meta", children: [_jsx("span", { className: "ds-project-name", children: projectName }), onOpenGuide && (_jsx("button", { type: "button", className: "ds-btn-ghost ds-topbar-guide-btn", "aria-label": "DevShell guide", title: "DevShell guide", onClick: () => onOpenGuide('workspace'), style: { fontSize: 13, lineHeight: 1, padding: '2px 7px', borderRadius: '50%', marginLeft: 6 }, children: "\u24D8" }))] }), _jsx("div", { className: "ds-view-switcher", children: _jsxs("div", { className: "ds-view-switcher-group", children: [_jsx("button", { className: `ds-view-btn${view === 'plan' ? ' ds-view-active' : ''}`, onClick: () => changeView('plan'), children: "Plan" }), _jsx("button", { className: `ds-view-btn${view === 'build' ? ' ds-view-active' : ''}`, onClick: () => changeView('build'), children: "Build" }), _jsx("button", { className: `ds-view-btn${view === 'test_drive' ? ' ds-view-active' : ''}`, onClick: () => {
                                        changeView('test_drive');
                                        // Default to the lowest-rank role on Test Drive entry.
                                        // availableRoles is ordered rank DESC (highest first); pick
                                        // the last entry as the lowest-privilege end-user view.
                                        const lowest = availableRoles[availableRoles.length - 1];
                                        if (lowest) {
                                            setPreviewRole(lowest.role);
                                            onRoleSwitch(lowest.role);
                                        }
                                        else {
                                            setPreviewRole(null);
                                            onRoleSwitch(null);
                                        }
                                    }, children: "Test Drive" })] }) }), _jsx("div", { className: "ds-topbar-spacer" }), view === 'test_drive' && availableRoles.length > 0 && (_jsxs("div", { className: "ds-preview-as", children: [_jsx("span", { className: "ds-preview-as-label", children: "Preview as" }), _jsxs("div", { className: "ds-preview-as-group", children: [availableRoles.map(r => (_jsx("button", { className: `ds-preview-as-btn${previewRole === r.role ? ' ds-preview-as-active' : ''}`, onClick: () => { setPreviewRole(r.role); onRoleSwitch(r.role); }, children: r.label }, r.role))), hasPublicSignup && (_jsx("button", { className: `ds-preview-as-btn${previewRole === null ? ' ds-preview-as-active' : ''}`, onClick: () => { setPreviewRole(null); onRoleSwitch(null); }, title: "Preview the signup screen as a logged-out visitor", children: "Signup" }))] })] })), _jsxs("div", { className: "ds-avatar-wrap", children: [_jsx("button", { className: "ds-avatar", onClick: () => setAvatarOpen(o => !o), title: developerName, "aria-label": "Account menu", children: developerInitials }), avatarOpen && (_jsxs("div", { className: "ds-avatar-menu", role: "menu", ref: avatarMenuRef, children: [_jsx("div", { className: "ds-avatar-menu-section", children: developerName }), _jsx("a", { href: `${dashboardUrl}/settings`, target: "_blank", rel: "noopener noreferrer", className: "ds-avatar-menu-item", onClick: () => setAvatarOpen(false), children: "Account settings \u2197" }), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("div", { className: "ds-avatar-menu-section", children: "DevShell preferences" }), _jsxs("div", { className: "ds-avatar-theme-row", children: [themeBtn('light', 'Light'), themeBtn('dark', 'Dark'), themeBtn('system', 'System')] }), _jsxs("label", { className: "ds-avatar-menu-item", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }, children: [_jsx("span", { children: "Auto-hide nav rail" }), _jsx("input", { type: "checkbox", checked: railAutoHide, onChange: (e) => {
                                                    const v = e.target.checked;
                                                    setRailAutoHide(v);
                                                    if (!v)
                                                        setRailRevealed(false);
                                                    try {
                                                        localStorage.setItem('cactai_devshell_rail_autohide', v ? '1' : '0');
                                                        window.dispatchEvent(new CustomEvent('cactai:rail_autohide:change', { detail: { value: v } }));
                                                    }
                                                    catch { /* ignore */ }
                                                }, style: { cursor: 'pointer' } })] }), _jsx("button", { className: "ds-avatar-menu-item", onClick: () => { setPrefsOpen(true); setAvatarOpen(false); }, children: "DevShell Configuration" }), availableRoles.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("div", { className: "ds-avatar-menu-section", children: "Open as role\u2026" }), _jsx("button", { className: "ds-avatar-menu-item", onClick: () => {
                                                    // Focus or open the dev tab.
                                                    window.open('/dev?view=build', 'cactai-dev');
                                                    setAvatarOpen(false);
                                                }, children: "Developer" }), availableRoles.map(r => (_jsx("button", { className: "ds-avatar-menu-item", onClick: () => {
                                                    // Authentic lens tab. The skeleton's /app route
                                                    // reads ?lens= and persists into window.name so
                                                    // subsequent fetches carry X-Cactai-Lens. Calling
                                                    // onRoleSwitch in addition mirrors the lens choice
                                                    // into the user's JWT default — useful so that
                                                    // tabs opened later without explicit lens carry
                                                    // the same preference.
                                                    window.open(`/app?lens=${encodeURIComponent(r.role)}`, `cactai-lens-${r.role}`);
                                                    onRoleSwitch(r.role);
                                                    setAvatarOpen(false);
                                                }, children: r.label }, r.role)))] })), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("button", { className: "ds-avatar-menu-item ds-avatar-menu-signout", onClick: () => setAvatarOpen(false), children: "Sign out" }), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("div", { className: "ds-avatar-menu-version", children: CACTAI_IDE_RELEASE_LABEL })] }))] })] }), _jsxs("div", { className: "ds-body", children: [_jsxs(_Fragment, { children: [railAutoHide && !railRevealed && !railCol && (_jsx("div", { className: "ds-rail-hover-zone", "aria-hidden": "true", onMouseEnter: revealRail })), _jsxs("nav", { className: `ds-rail${railCol ? ' is-collapsed' : ''}${railAutoHide && !railCol ? ' is-autohide' : ''}${railAutoHide && railRevealed && !railCol ? ' is-revealed' : ''}`, "aria-label": "DevShell navigation", onMouseEnter: railAutoHide && !railCol ? revealRail : undefined, onMouseLeave: railAutoHide && !railCol ? hideRailWithDelay : undefined, children: [_jsx("button", { className: "ds-rail-toggle", onClick: () => setRailCol(!railCol), "aria-label": railCol ? 'Open navigation' : 'Collapse navigation', "aria-expanded": !railCol, title: railCol ? 'Open navigation' : 'Collapse navigation', children: railCol ? '›' : '‹' }), !railCol && SECTIONS.map(s => (_jsx(RailBtn, { section: s, active: section === s, onClick: () => changeSection(s) }, s)))] })] }), _jsxs("div", { className: "ds-main", children: [!chatCol && (_jsx(DevChatPanel, { shell: shell, messages: messages, agentState: agentState, character: character, agentDisplayName: agentDisplayName, activeView: view, onCollapse: () => setChatCol(true), inspectorLabel: inspector ? inspector.element_path.split(' > ').pop() : undefined, onClearInspector: clearInspector, streamingContent: streamingContent, style: { width: (railAutoHide && !railRevealed && !railCol) ? chatW + RAIL_FREED : chatW } })), !chatCol && _jsx("div", { className: "ds-resize-h", onMouseDown: startChatDrag, role: "separator", "aria-orientation": "vertical" }), chatCol && (
                            // Collapsed-chat re-open affordance. Matches the files
                            // panel's collapsed-tab pattern — the chat stays persistently
                            // visible as a thin vertical strip with an arrow that
                            // expands the panel back to its previous width on click.
                            // Unread dot appears when new messages arrive while collapsed.
                            _jsxs("button", { onClick: toggleChat, "aria-label": "Open chat", "aria-expanded": "false", title: "Open chat", className: "ds-chat-collapsed-tab", children: [_jsx("span", { style: { fontSize: 13, lineHeight: 1 }, children: "\u203A" }), hasUnread && _jsx("span", { "aria-hidden": true, className: "ds-chat-collapsed-unread" })] })), chatGuideSlot && (_jsx("div", { className: "ds-chat-guide-host", style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: chatW, zIndex: 60, pointerEvents: 'none', overflow: 'hidden' }, children: chatGuideSlot })), _jsxs("div", { className: "ds-right-area", children: [_jsx("div", { className: "ds-content", children: prefsOpen
                                            ? renderPrefsPage()
                                            : (showPanel ? renderPanel() : renderMainContent()) }), (treeCol ? (_jsx("button", { className: "ds-files-collapsed-tab", onClick: () => setTreeCol(false), "aria-expanded": "false", children: "Files \u2303" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-resize-v", onMouseDown: startTreeDrag, role: "separator", "aria-orientation": "horizontal" }), _jsxs("div", { className: "ds-files-panel", style: { height: treeH, flexShrink: 0 }, children: [_jsxs("div", { className: "ds-files-panel-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }, children: [_jsx("span", { className: "ds-files-panel-title", children: "Files" }), onOpenFileGuide && (_jsx("button", { onClick: onOpenFileGuide, "aria-label": "Open file directory guide", title: "File directory guide", style: {
                                                                            background: 'transparent',
                                                                            border: '1px solid var(--ds-border-soft, rgba(255,255,255,0.12))',
                                                                            borderRadius: 10,
                                                                            color: 'var(--ds-text-2)',
                                                                            cursor: 'pointer',
                                                                            width: 18, height: 18,
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: 10, fontWeight: 600,
                                                                            fontStyle: 'italic',
                                                                            fontFamily: 'serif',
                                                                            padding: 0, flexShrink: 0,
                                                                        }, children: "i" })), _jsx(SyncIndicator, { state: syncState }), deployBearerToken && (_jsx(DeployIndicator, { projectId: projectId, platformBaseUrl: platformBaseUrl, bearerToken: deployBearerToken, vercelDashboardUrl: vercelDashUrl }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("button", { type: "button", className: "ds-files-panel-collapse", onClick: () => openPendingEdits(), title: pendingFiles.length === 0
                                                                            ? 'No pending edits yet — click to open the empty modal'
                                                                            : `${pendingFiles.length} pending edit${pendingFiles.length === 1 ? '' : 's'}`, "aria-label": "Open pending edits", style: { opacity: pendingFiles.length === 0 ? 0.7 : 1 }, children: ["Pending ", pendingFiles.length > 0 && `(${pendingFiles.length})`] }), _jsx("button", { className: "ds-files-panel-collapse", onClick: () => setTreeCol(true), "aria-label": "Collapse Files", "aria-expanded": "true", children: "Collapse \u2304" })] })] }), _jsx("div", { className: "ds-files-panel-body", children: _jsx(FileTree, { nodes: treeNodes, activeFilePath: activeFilePath, onFileSelect: onFileSelect, fileContent: fileContent, fileLoading: fileLoading, onExitFileView: onExitFileView, onCollapse: () => setTreeCol(true), uncommittedPaths: uncommittedPaths, onCommitFile: handleCommitFile, onRestore: onDiscardPendingFile ? handleDiscardOne : undefined, onUndoFile: onDiscardPendingFile ? handleUndoOneRequest : undefined, onCreateFile: onCreateFile, onRenameFile: onRenameFile, onDeleteFile: onDeleteFile }) }), filesGuideSlot] })] })))] })] })] }), commitModal.kind === 'pending' && (_jsx(PendingEditsModal, { files: pendingFiles, initialSelection: commitModal.initialSelection, committing: committing, error: commitError, onCommitToDev: handleCommitDev, onDiscardOne: handleDiscardOne, onDiscardAll: handleDiscardAll, onOpenHistory: openHistory, onCancel: closeModals, onOpenGuide: onOpenPendingGuide, guideSlot: pendingGuideSlot })), commitModal.kind === 'history' && (_jsx(CommitHistoryModal, { repoCommitsUrl: githubRepoUrl ? `${githubRepoUrl}/commits/dev` : undefined, onRevertCommit: onRevertCommit ? handleRevertCommit : undefined, onClose: closeModals })), commitModal.kind === 'conflict' && (_jsx(CommitConflictModal, { files: commitModal.files, error: commitError, submitting: committing, onSubmit: (resolutions) => handleConflictSubmit(commitModal.pendingPaths, resolutions), onCancel: handleConflictCancel })), commitModal.kind === 'reverting' && (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "ds-commit-modal-card ds-commit-reverting-card", role: "dialog", "aria-modal": "true", children: [_jsx("div", { className: "ds-commit-modal-header", children: _jsxs("div", { className: "ds-commit-modal-titles", children: [_jsx("div", { className: "ds-commit-modal-title", children: "Reverting commit\u2026" }), _jsx("div", { className: "ds-commit-modal-subtitle", children: commitModal.commit.message })] }) }), _jsx("div", { className: "ds-commit-modal-body", children: _jsx("div", { className: "ds-commit-modal-empty", children: "Computing inverse changeset and committing to dev." }) })] }) })), undoConfirmPath && (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: (e) => { if (e.target === e.currentTarget)
                    cancelUndoOne(); }, children: _jsxs("div", { className: "ds-commit-modal-card ds-undo-confirm-card", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "ds-undo-confirm-title", children: [_jsx("div", { className: "ds-commit-modal-header", children: _jsxs("div", { className: "ds-commit-modal-titles", children: [_jsx("div", { id: "ds-undo-confirm-title", className: "ds-commit-modal-title", children: "Discard local changes to this file?" }), _jsx("div", { className: "ds-commit-modal-subtitle", children: undoConfirmPath })] }) }), _jsx("div", { className: "ds-commit-modal-body", children: _jsx("div", { className: "ds-commit-modal-confirm-text", children: "This cannot be undone. The file returns to its last-committed state on dev." }) }), _jsxs("div", { className: "ds-commit-modal-footer", children: [_jsx("button", { type: "button", className: "ds-commit-modal-cancel", onClick: cancelUndoOne, autoFocus: true, children: "Cancel" }), _jsx("div", { style: { flex: 1 } }), _jsx("button", { type: "button", className: "ds-commit-modal-btn ds-commit-modal-btn-primary", onClick: confirmUndoOne, children: "Discard changes" })] })] }) }))] }));
}
//# sourceMappingURL=DevShell.js.map