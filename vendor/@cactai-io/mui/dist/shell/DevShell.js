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
//   Project settings is the ProjectSettingsPanel — per-project credentials
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
import { WorkspacePanel, BuildPanel, SchemaPanel, ProjectSettingsPanel, } from '../panels/index.js';
import { DevShellPreferencesModal } from '../panels/DevShellPreferencesModal.js';
import { injectDevShellStyles } from './DevShellStyles.js';
import { ThemeInspector } from '../inspector/ThemeInspector.js';
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
const SECTIONS = ['workspace', 'build', 'schema', 'project-settings'];
const S_LABEL = {
    workspace: 'Workspace',
    // 'build' is the stable internal section key for backwards-compat with
    // host wiring; the user-facing label is "Library" (storage closet for
    // skills + tools the developer authors or installs from the
    // marketplace, per user direction 2026-05-30).
    build: 'Library',
    schema: 'Schema',
    'project-settings': 'Project settings',
};
// Hover-tooltip / aria-label text for the rail icons. Defaults to S_LABEL
// for any section not listed here. The Project settings entry uses a long
// descriptive tooltip so the user understands the panel's full intended
// scope (workflow, tools, skills, providers, credentials, collaborators),
// while the panel header itself stays the short "Project settings" label.
const S_TOOLTIP = {
    build: "Library — your collection of skills and tools (authored or installed).",
    'project-settings': "Project settings — this app's workflow, available tools, available skills, providers, credentials, and collaborators.",
};
const S_ICON = {
    chat: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
    workspace: 'M3 12L12 4l9 8M5 10v10h14V10',
    // Build: cube + stack (combines skills/tools + marketplace install).
    build: 'M12 2L3 7v10l9 5 9-5V7l-9-5zM3 7l9 5 9-5M12 12v10',
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
export function DevShell({ shell, projectId, projectName, branch, syncState, pendingFiles, developerInitials, developerName, agentDisplayName, agentState, character, messages, streamingContent, availableRoles, onRoleSwitch, onCommitToDev, onRevertCommit, onDiscardPendingFile, onDiscardAllPending, deployBearerToken, platformBaseUrl, vercelPreviewUrl, githubRepoUrl, vercelDashUrl, treeNodes, activeFilePath, fileContent, fileLoading, onFileSelect, onExitFileView, workflowStep, workflowForm, decisions, backlog, sprints, onWorkflowFormSubmit, onRevisitDecision, onResolveBacklog, workspaceProps, buildProps, skills, schemaProps, settingsProps, devshellPreferences, dashboardUrl, apiBaseUrl, studioPreviewUrl, children, onSectionChange, onViewChange, }) {
    useEffect(() => { injectDevShellStyles(); }, []);
    // Body lock while the DevShell IDE is mounted. Pre-fix the browser
    // could scroll the entire page past [data-cactai-shell]'s 100vh
    // bounds — exposing white body background on all four sides
    // (visible during macOS rubber-band overscroll AND from any subtle
    // body-height drift). Adding a class scoped to /dev's lifetime
    // (a) clamps overflow on html + body, (b) disables overscroll
    // chaining so trackpad gestures don't bubble to the document.
    //
    // Other routes (/operate, /app, …) need normal page scrolling, so
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
    const [view, setView] = useState('build');
    const [role, setRole] = useState(availableRoles[0]?.role ?? 'user');
    const [section, setSection] = useState('workspace');
    const [avatarOpen, setAvatarOpen] = useState(false);
    // Ref on the avatar menu container so an outside-click handler can
    // distinguish a click inside the menu from a click anywhere else.
    // Without this, the menu stays open after clicking outside which
    // feels broken — every other dropdown in the app closes on
    // outside click.
    const avatarMenuRef = useRef(null);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    // v1.2 Thread 06 — DevShell preferences modal (capability config in
    // scope='devshell'). Opened from the avatar menu.
    const [prefsOpen, setPrefsOpen] = useState(false);
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
    const changeView = useCallback((v) => { setView(v); onViewChange?.(v); }, [onViewChange]);
    const changeSection = useCallback((s) => {
        setSection(s);
        onSectionChange?.(s);
    }, [onSectionChange]);
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
    // Files panel is always-on in Build view (unless collapsed). It is no
    // longer gated on the rail section — Workspace, Build, Schema, and
    // Project settings all render their panel above the file tree.
    const showTree = isBuild && !treeCol;
    // The rail panel renders whenever Build view is active. The four sections
    // are all panel-bearing (Files isn't one of them anymore).
    const showPanel = isBuild;
    function renderMainContent() {
        if (view === 'role_view') {
            // Role view renders the host skeleton app's content. Mark it so the
            // [data-appshell-preview] selector resets DevShell chrome typography.
            // No section binding — role views inherit the active panel's accent.
            //
            // v1.2 commit-flow rebuild: RoleViewBanner mounts at the top of the
            // pane. It surfaces a non-intrusive warning when the developer is
            // previewing a file or page that has pending non-config code edits
            // — those won't show up until commit + Vercel deploy. The banner
            // returns null when no eligible pending file exists, so it's safe
            // to include unconditionally here.
            return (_jsxs("div", { style: { flex: 1, overflow: 'auto', position: 'relative' }, children: [_jsx(RoleViewBanner, { projectId: projectId, pendingFiles: roleViewPendingFiles, activeRoleViewPath: activeFilePath }), _jsx(StudioOverlay, { skill_id: "shell_root", onInspect: handleInspect, active: false, children: _jsx("div", { "data-appshell-preview": true, style: { height: '100%' }, children: children ?? _jsx("div", { className: "ds-preview-empty", children: _jsx("span", { children: "Role view" }) }) }) })] }));
        }
        if (view === 'plan' || (view === 'build' && workflowStep !== 'complete')) {
            // Plan view → indigo. Build-view-during-workflow → amber (workflow is
            // part of the Build experience even before preview is live).
            const grad = view === 'plan' ? 'indigo' : 'amber';
            return (_jsx("div", { style: { ...bindSection(`${view}-view`, grad), flex: 1, overflow: 'hidden' }, children: _jsx(WorkflowSurface, { step: workflowStep, activeForm: view === 'plan' ? undefined : workflowForm, decisions: decisions, backlog: backlog, sprints: sprints, onFormSubmit: onWorkflowFormSubmit, onRevisit: onRevisitDecision, onResolveBacklog: onResolveBacklog }) }));
        }
        // Build view post-workflow — preview. Build view gets the amber accent. The
        // [data-appshell-preview] attribute on the child wrapper resets DevShell
        // chrome typography so the host app's own theme governs preview content.
        return (_jsx("div", { style: bindSection('build-view', 'amber'), className: "ds-preview-wrap", children: _jsxs("div", { className: "ds-preview-window", children: [_jsxs("div", { className: "ds-preview-chrome", children: [_jsxs("div", { className: "ds-traffic", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsx("div", { className: "ds-preview-url ds-mono", children: vercelPreviewUrl ? vercelPreviewUrl.replace(/^https?:\/\//, '') : `${projectName}.vercel.app` }), vercelPreviewUrl && _jsx("a", { href: vercelPreviewUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-preview-open", children: "Open \u2197" })] }), _jsxs("div", { className: "ds-preview-content", children: [_jsx(StudioOverlay, { skill_id: "shell_root", onInspect: handleInspect, active: true, children: _jsx("div", { "data-appshell-preview": true, style: { height: '100%' }, children: children ?? _jsx("div", { className: "ds-preview-empty", children: vercelPreviewUrl ? _jsx("a", { href: vercelPreviewUrl, target: "_blank", rel: "noopener noreferrer", className: "ds-preview-link", children: "Open preview \u2197" }) : 'Commit to dev to see preview.' }) }) }), inspector && (_jsxs("div", { className: "ds-inspector-bar", children: [_jsx("span", { className: "ds-inspector-dot" }), _jsxs("span", { className: "ds-inspector-target", children: [_jsx("span", { className: "ds-inspector-file ds-mono", children: inspector.skill_id }), ' · ', inspector.element_path.split(' > ').pop()] }), _jsx("span", { className: "ds-inspector-hint", children: "type below to edit \u2193" }), _jsx("button", { className: "ds-inspector-clear", onClick: clearInspector, "aria-label": "Clear", children: "\u2715" })] }))] })] }) }));
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
        const wrap = (node) => _jsx("div", { style: {
                ...bindSection(`${section}-panel`, grad),
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
            }, children: node });
        switch (section) {
            case 'workspace':
                return wrap(_jsx(WorkspacePanel, { ...workspaceProps, projectName: projectName, githubRepoUrl: githubRepoUrl, vercelDashUrl: vercelDashUrl, vercelPreviewUrl: vercelPreviewUrl, syncState: syncState, onViewPendingEdits: () => openPendingEdits() }));
            case 'build':
                return wrap(_jsx(BuildPanel, { ...buildProps, skills: skills }));
            case 'schema':
                return wrap(_jsx(SchemaPanel, { ...schemaProps }));
            case 'project-settings':
                return wrap(_jsx(ProjectSettingsPanel, { ...settingsProps, dashboardUrl: dashboardUrl }));
            default:
                return null;
        }
    }
    // Theme tri-state buttons rendered inside the avatar menu. Kept inline
    // (rather than as a separate component) so the menu remains a single
    // place that owns its layout.
    const themeBtn = (mode, label) => (_jsx("button", { className: `ds-avatar-theme-btn${themeMode === mode ? ' ds-avatar-theme-btn-active' : ''}`, onClick: () => chooseTheme(mode), "aria-pressed": themeMode === mode, children: label }, mode));
    return (_jsxs("div", { "data-cactai-shell": true, "data-theme": resolvedTheme, "data-color-scheme": resolvedTheme, children: [_jsx(SvgDefs, {}), _jsxs("header", { className: "ds-topbar", children: [_jsxs("div", { className: "ds-brand", children: [_jsx(CactusMark, { size: 22, className: "ds-brand-mark" }), "Cactai"] }), _jsx("div", { className: "ds-project-meta", children: _jsx("span", { className: "ds-project-name", children: projectName }) }), _jsx("div", { className: "ds-view-switcher", children: _jsxs("div", { className: "ds-view-switcher-group", children: [_jsx("button", { className: `ds-view-btn${view === 'plan' ? ' ds-view-active' : ''}`, onClick: () => changeView('plan'), children: "Plan" }), _jsx("button", { className: `ds-view-btn${view === 'build' ? ' ds-view-active' : ''}`, onClick: () => changeView('build'), children: "Build" })] }) }), _jsx("div", { className: "ds-topbar-spacer" }), availableRoles.length > 0 && (_jsxs("div", { className: "ds-preview-as", children: [_jsx("span", { className: "ds-preview-as-label", children: "Preview as" }), _jsxs("div", { className: "ds-preview-as-group", children: [_jsx("button", { className: `ds-preview-as-btn${view === 'build' ? ' ds-preview-as-active' : ''}`, onClick: () => changeView('build'), children: "Developer" }), availableRoles.map(r => (_jsx("button", { className: `ds-preview-as-btn${view === 'role_view' && role === r.role ? ' ds-preview-as-active' : ''}`, onClick: () => { changeView('role_view'); setRole(r.role); onRoleSwitch(r.role); }, children: r.label }, r.role)))] })] })), _jsxs("div", { className: "ds-avatar-wrap", children: [_jsx("button", { className: "ds-avatar", onClick: () => setAvatarOpen(o => !o), title: developerName, "aria-label": "Account menu", children: developerInitials }), avatarOpen && (_jsxs("div", { className: "ds-avatar-menu", role: "menu", ref: avatarMenuRef, children: [_jsx("div", { className: "ds-avatar-menu-section", children: developerName }), _jsx("a", { href: `${dashboardUrl}/settings`, target: "_blank", rel: "noopener noreferrer", className: "ds-avatar-menu-item", onClick: () => setAvatarOpen(false), children: "Account settings \u2197" }), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("div", { className: "ds-avatar-menu-section", children: "DevShell preferences" }), _jsxs("div", { className: "ds-avatar-theme-row", children: [themeBtn('light', 'Light'), themeBtn('dark', 'Dark'), themeBtn('system', 'System')] }), _jsx("button", { className: "ds-avatar-menu-item", onClick: () => { setPrefsOpen(true); setAvatarOpen(false); }, children: "Tools and skills\u2026" }), availableRoles.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("div", { className: "ds-avatar-menu-section", children: "Open as role\u2026" }), _jsx("button", { className: "ds-avatar-menu-item", onClick: () => {
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
                                                }, children: r.label }, r.role)))] })), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("button", { className: "ds-avatar-menu-item", onClick: () => { setInspectorOpen(true); setAvatarOpen(false); }, children: "Theme inspector" }), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("button", { className: "ds-avatar-menu-item ds-avatar-menu-signout", onClick: () => setAvatarOpen(false), children: "Sign out" }), _jsx("div", { className: "ds-avatar-menu-divider" }), _jsx("div", { className: "ds-avatar-menu-version", children: CACTAI_IDE_RELEASE_LABEL })] }))] })] }), _jsxs("div", { className: "ds-body", children: [_jsxs("nav", { className: "ds-rail", "aria-label": "DevShell navigation", children: [_jsx("button", { className: [
                                    'ds-rail-chat-btn',
                                    !chatCol ? 'ds-rail-active' : '',
                                    hasUnread && chatCol ? 'ds-has-unread' : '',
                                ].filter(Boolean).join(' '), onClick: toggleChat, title: "Chat", "aria-label": "Toggle chat", "aria-pressed": !chatCol, children: _jsx("svg", { width: "19", height: "19", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: S_ICON.chat }) }) }), SECTIONS.map(s => (_jsx(RailBtn, { section: s, active: section === s && isBuild, onClick: () => changeSection(s) }, s))), _jsx("div", { className: "ds-rail-spacer" })] }), _jsxs("div", { className: "ds-main", children: [!chatCol && (_jsx(DevChatPanel, { shell: shell, messages: messages, agentState: agentState, character: character, agentDisplayName: agentDisplayName, activeView: view, onCollapse: () => setChatCol(true), inspectorLabel: inspector ? inspector.element_path.split(' > ').pop() : undefined, onClearInspector: clearInspector, streamingContent: streamingContent, style: { width: chatW } })), !chatCol && _jsx("div", { className: "ds-resize-h", onMouseDown: startChatDrag, role: "separator", "aria-orientation": "vertical" }), _jsxs("div", { className: "ds-right-area", children: [_jsx("div", { className: "ds-content", children: showPanel ? renderPanel() : renderMainContent() }), isBuild && (treeCol ? (_jsx("button", { className: "ds-files-collapsed-tab", onClick: () => setTreeCol(false), "aria-expanded": "false", children: "Files \u2303" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "ds-resize-v", onMouseDown: startTreeDrag, role: "separator", "aria-orientation": "horizontal" }), _jsxs("div", { className: "ds-files-panel", style: { height: treeH, flexShrink: 0 }, children: [_jsxs("div", { className: "ds-files-panel-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }, children: [_jsx("span", { className: "ds-files-panel-title", children: "Files" }), _jsx(SyncIndicator, { state: syncState }), deployBearerToken && (_jsx(DeployIndicator, { projectId: projectId, platformBaseUrl: platformBaseUrl, bearerToken: deployBearerToken, vercelDashboardUrl: vercelDashUrl }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("button", { type: "button", className: "ds-files-panel-collapse", onClick: () => openPendingEdits(), title: pendingFiles.length === 0
                                                                            ? 'No pending edits yet — click to open the empty modal'
                                                                            : `${pendingFiles.length} pending edit${pendingFiles.length === 1 ? '' : 's'}`, "aria-label": "Open pending edits", style: { opacity: pendingFiles.length === 0 ? 0.7 : 1 }, children: ["Pending ", pendingFiles.length > 0 && `(${pendingFiles.length})`] }), _jsx("button", { className: "ds-files-panel-collapse", onClick: () => setTreeCol(true), "aria-label": "Collapse Files", "aria-expanded": "true", children: "Collapse \u2304" })] })] }), _jsx("div", { className: "ds-files-panel-body", children: _jsx(FileTree, { nodes: treeNodes, activeFilePath: activeFilePath, onFileSelect: onFileSelect, fileContent: fileContent, fileLoading: fileLoading, onExitFileView: onExitFileView, onCollapse: () => setTreeCol(true), uncommittedPaths: uncommittedPaths, onCommitFile: handleCommitFile, onRestore: onDiscardPendingFile ? handleDiscardOne : undefined, onUndoFile: onDiscardPendingFile ? handleUndoOneRequest : undefined }) })] })] })))] })] })] }), inspectorOpen && (_jsx("div", { "data-theme-inspector-modal": true, onClick: (e) => { if (e.target === e.currentTarget)
                    setInspectorOpen(false); }, children: _jsx("div", { className: "ti-modal-card", role: "document", children: _jsx(ThemeInspector, { projectId: projectId, apiBaseUrl: apiBaseUrl, previewUrl: studioPreviewUrl, onClose: () => setInspectorOpen(false) }) }) })), commitModal.kind === 'pending' && (_jsx(PendingEditsModal, { files: pendingFiles, initialSelection: commitModal.initialSelection, committing: committing, error: commitError, onCommitToDev: handleCommitDev, onDiscardOne: handleDiscardOne, onDiscardAll: handleDiscardAll, onOpenHistory: openHistory, onCancel: closeModals })), commitModal.kind === 'history' && (_jsx(CommitHistoryModal, { repoCommitsUrl: githubRepoUrl ? `${githubRepoUrl}/commits/dev` : undefined, onRevertCommit: onRevertCommit ? handleRevertCommit : undefined, onClose: closeModals })), commitModal.kind === 'conflict' && (_jsx(CommitConflictModal, { files: commitModal.files, error: commitError, submitting: committing, onSubmit: (resolutions) => handleConflictSubmit(commitModal.pendingPaths, resolutions), onCancel: handleConflictCancel })), commitModal.kind === 'reverting' && (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "ds-commit-modal-card ds-commit-reverting-card", role: "dialog", "aria-modal": "true", children: [_jsx("div", { className: "ds-commit-modal-header", children: _jsxs("div", { className: "ds-commit-modal-titles", children: [_jsx("div", { className: "ds-commit-modal-title", children: "Reverting commit\u2026" }), _jsx("div", { className: "ds-commit-modal-subtitle", children: commitModal.commit.message })] }) }), _jsx("div", { className: "ds-commit-modal-body", children: _jsx("div", { className: "ds-commit-modal-empty", children: "Computing inverse changeset and committing to dev." }) })] }) })), undoConfirmPath && (_jsx("div", { className: "ds-commit-modal-backdrop", role: "presentation", onClick: (e) => { if (e.target === e.currentTarget)
                    cancelUndoOne(); }, children: _jsxs("div", { className: "ds-commit-modal-card ds-undo-confirm-card", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "ds-undo-confirm-title", children: [_jsx("div", { className: "ds-commit-modal-header", children: _jsxs("div", { className: "ds-commit-modal-titles", children: [_jsx("div", { id: "ds-undo-confirm-title", className: "ds-commit-modal-title", children: "Discard local changes to this file?" }), _jsx("div", { className: "ds-commit-modal-subtitle", children: undoConfirmPath })] }) }), _jsx("div", { className: "ds-commit-modal-body", children: _jsx("div", { className: "ds-commit-modal-confirm-text", children: "This cannot be undone. The file returns to its last-committed state on dev." }) }), _jsxs("div", { className: "ds-commit-modal-footer", children: [_jsx("button", { type: "button", className: "ds-commit-modal-cancel", onClick: cancelUndoOne, autoFocus: true, children: "Cancel" }), _jsx("div", { style: { flex: 1 } }), _jsx("button", { type: "button", className: "ds-commit-modal-btn ds-commit-modal-btn-primary", onClick: confirmUndoOne, children: "Discard changes" })] })] }) })), prefsOpen && (devshellPreferences
                ? (_jsx(DevShellPreferencesModal, { catalogue: devshellPreferences.catalogue, config: devshellPreferences.config, onPatch: devshellPreferences.onPatch, onClose: () => setPrefsOpen(false) }))
                : (
                // Stub modal when the host hasn't wired the prefs data yet.
                // Renders the same chrome as the real modal so the developer
                // still has a visible confirmation that the menu entry fired.
                _jsx("div", { role: "dialog", "aria-modal": "true", style: {
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999,
                    }, onClick: () => setPrefsOpen(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), style: {
                            background: 'var(--ds-elevated)',
                            border: '1px solid var(--ds-border)',
                            borderRadius: 'var(--ds-r-md)',
                            padding: 20,
                            maxWidth: 420,
                        }, children: [_jsx("div", { style: { fontSize: 13, color: 'var(--ds-text)', marginBottom: 8 }, children: "DevShell preferences" }), _jsx("div", { style: { fontSize: 12, color: 'var(--ds-text-3)' }, children: "Tools and skills configuration data is loading\u2026" }), _jsx("button", { className: "ds-btn-ghost", onClick: () => setPrefsOpen(false), style: { fontSize: 11.5, marginTop: 12 }, children: "Close" })] }) })))] }));
}
//# sourceMappingURL=DevShell.js.map