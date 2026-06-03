import { type ReactNode } from 'react';
import type { MUIShell } from './MUIShell.js';
import type { MorphState } from '@cactai-io/types';
import type { PersonalityCharacter } from '@cactai-io/types';
import type { ChatMessage } from '../components/DevChatPanel.js';
import type { FileNode } from '../components/FileTree.js';
import type { WorkspacePanelProps, BuildPanelProps, SchemaPanelProps, AppConfigurationPanelProps } from '../panels/index.js';
import type { SkillDescriptor } from '../types/mui.types.js';
import type { SprintRecord, GoalBacklogEntry, SurfaceFormField, WorkflowDecisionRecord } from '@cactai-io/types';
import type { CommitListItem } from '../commit/CommitHistoryModal.js';
import type { Resolution } from '../commit/CommitConflictModal.js';
import type { SyncState, PendingFileSummary } from '../commit/types.js';
export type DevShellView = 'build' | 'plan' | 'test_drive';
export type RoleViewRole = string;
export type RailSection = 'workspace' | 'build' | 'authoring' | 'schema' | 'project-settings';
/**
 * Optional second argument to onCommitToDev. Allows the shell to pass
 * conflict resolutions (Thread 11) and revert metadata (Thread 12)
 * without changing the primary signature for hosts that don't use
 * those flows.
 *
 * - `resolutions`: per-path resolution map from CommitConflictModal.
 *   When present, the host should construct the commit body with
 *   per-file `content` set to the resolved content, the matching
 *   `resolved: true` flag, and `paths` reflecting only files that
 *   weren't dropped via 'keep_remote'.
 * - `reverts_sha`: original SHA being reverted. Host sets this on
 *   the commit body so commit_log.reverts_sha is populated.
 * - `message`: optional commit message override. The revert flow uses
 *   `Revert "<original message>"` per git convention; if omitted the
 *   host falls back to its default.
 * - `simulateConflict`: dev-only test fixture. Host appends
 *   `?simulateCommitConflict=1` to the commit URL when true.
 */
export interface CommitInvocationOptions {
    resolutions?: Map<string, Resolution>;
    /** Map of path → content used by the revert flow. The host fills the
     *  commit body's `files[].content` from this map; values must match
     *  the inverse of the original commit's snapshots. */
    contentByPath?: Map<string, string | null>;
    /** Pre-computed inverse file set produced by the revert flow. When
     *  set, the host should use these as the commit body's `files`
     *  instead of resolving from `paths` + pending_files. */
    fileSet?: ReadonlyArray<{
        path: string;
        operation: 'edit' | 'create' | 'delete' | 'rename' | 'move';
        new_path?: string | null;
        content?: string | null;
        last_edited_at: string;
        lines_added: number;
        lines_removed: number;
    }>;
    reverts_sha?: string;
    message?: string;
    simulateConflict?: boolean;
}
export interface DevShellRole {
    role: RoleViewRole;
    label: string;
    session_id: string;
}
export interface DevShellProps {
    shell: MUIShell;
    projectId: string;
    projectName: string;
    branch: string;
    /** Current sync state. The DevShell uses this to drive the SyncIndicator,
     *  the per-file modified dots, the file-tree panel header's pending-edits
     *  trigger, and the action button inside the PendingEditsModal.
     *  v1.2 commit-flow rebuild: only the 'local' and 'dev' variants remain. */
    syncState: SyncState;
    /** Per-file pending-edits detail. Required when `syncState.branch ===
     *  'local'`; the modal pulls its file list and `+N / -N` summaries from
     *  here. When the state is `dev · synced` this can be an empty array. */
    pendingFiles: PendingFileSummary[];
    developerInitials: string;
    developerName: string;
    agentDisplayName: string;
    agentState: MorphState;
    character?: PersonalityCharacter;
    messages: ChatMessage[];
    streamingContent?: string;
    availableRoles: DevShellRole[];
    /** Cactai API base URL used by the Theme Inspector to read/write theme.ts.
     *  Typically the same value passed to the skeleton's API client. */
    apiBaseUrl: string;
    /** Optional URL pointing at the skeleton's _studio/preview route. When
     *  unset, the Theme Inspector renders without a live preview iframe. */
    studioPreviewUrl?: string;
    /** Called when the Test Drive's preview lens changes. Receives the
     *  selected role (string) for a role-lens preview, or null when the
     *  developer picks the Signup lens (logged-out / signup-page render). */
    onRoleSwitch: (role: RoleViewRole | null) => void;
    /** True when the deployed app exposes a public signup route. When true
     *  the Preview-as bar shows a "Signup" button alongside the role
     *  buttons. When false the button is hidden — apps fully gated behind
     *  auth have no useful Signup preview. Default false. */
    hasPublicSignup?: boolean;
    /** Commit the given file paths to the dev branch. Resolves once the
     *  commit has succeeded (or rejects on failure — the shell surfaces the
     *  error inline in the modal). The shell handles closing the modal on
     *  success; consumers should not optimistically clear local state until
     *  this resolves.
     *
     *  v1.2 commit-flow rebuild: the parallel onCommitToMain prop is gone —
     *  developers merge dev to main manually in GitHub.
     *
     *  Thread 11 — when /api/github/commit returns 409 with a conflict
     *  payload, host code should throw a `CommitConflictError` carrying
     *  the parsed `files` array. The shell catches that specifically and
     *  opens CommitConflictModal. The shell then calls back into
     *  `onCommitToDev(paths, opts)` with `opts.resolutions` populated so
     *  the host can build the resolved-retry body.
     *
     *  Thread 12 — set `opts.reverts_sha` and `opts.message` when the
     *  revert flow drives a commit via this same callback. */
    onCommitToDev: (paths: string[], opts?: CommitInvocationOptions) => Promise<void>;
    /** Thread 12 — revert a single past commit. Optional. When omitted,
     *  the per-commit "Revert this commit" menu item is hidden in
     *  CommitHistoryModal. Wires through /api/github/revert/[sha]. The
     *  shell handles the confirmation modal; the host only performs the
     *  network call and refreshes pending state on success.
     *
     *  The promise resolves when the revert commit has been recorded; it
     *  rejects with an Error whose message surfaces in the shell's
     *  inline error banner. A CommitConflictError can be thrown to route
     *  through the CommitConflictModal exactly like a normal commit
     *  conflict — the revert's inverse changeset is processed as a
     *  regular multi-file commit body. */
    onRevertCommit?: (commit: CommitListItem) => Promise<void>;
    /** Discard a single pending row. The host wires this to
     *  PendingFilesManager.discardPendingFile. Optional — when omitted the
     *  pending-edits modal's per-row discard button is hidden and the
     *  file-tree's right-click "Restore" menu is hidden. */
    onDiscardPendingFile?: (path: string) => void;
    /** Discard every pending row. The host wires this to
     *  PendingFilesManager.discardAll(). Optional, same nuance as above. */
    onDiscardAllPending?: () => void;
    /** UI-driven file CRUD. When wired, the file-tree shows New / Rename
     *  / Delete affordances. All ops stage in pending_files via the
     *  skeleton's /api/git/file endpoints. */
    onCreateFile?: (path: string, content?: string) => Promise<void> | void;
    onRenameFile?: (path: string, newPath: string) => Promise<void> | void;
    onDeleteFile?: (path: string) => Promise<void> | void;
    /** Bearer token for the DeployIndicator's SSE subscription. Typically
     *  the developer's session-scoped API key. Optional — when omitted,
     *  the DeployIndicator is not rendered. */
    deployBearerToken?: string;
    /** Platform base URL for the deploy-events SSE endpoint. Defaults to
     *  same-origin. */
    platformBaseUrl?: string;
    vercelPreviewUrl?: string;
    githubRepoUrl?: string;
    vercelDashUrl?: string;
    treeNodes: FileNode[];
    activeFilePath?: string;
    fileContent?: string | null;
    fileLoading?: boolean;
    onFileSelect: (path: string) => void;
    onExitFileView: () => void;
    workflowStep: string;
    workflowForm?: {
        stage: string;
        fields: SurfaceFormField[];
    };
    decisions: Record<string, WorkflowDecisionRecord>;
    backlog: GoalBacklogEntry[];
    sprints: SprintRecord[];
    onWorkflowFormSubmit: (choices: Record<string, unknown>) => void;
    onRevisitDecision: (key: string) => void;
    onResolveBacklog: (id: string) => void;
    /** Optional backlog CRUD — when wired the Plan view's backlog adds
     *  + Add, edit, and Delete affordances alongside Dismiss. */
    onCreateBacklog?: (description: string) => Promise<void> | void;
    onUpdateBacklog?: (id: string, description: string) => Promise<void> | void;
    onDeleteBacklog?: (id: string) => Promise<void> | void;
    /** Optional sprint U + D — rename + hard delete. Task add/remove is
     *  intentionally not exposed; those re-run through sprint:refine. */
    onRenameSprint?: (id: string, name: string) => Promise<void> | void;
    onDeleteSprint?: (id: string) => Promise<void> | void;
    /** Plan-view notes — free-form project markdown + per-decision threads.
     *  Backed by /api/workflow/notes. When the save/add handlers are omitted
     *  the corresponding affordance is hidden. */
    projectNotes?: string;
    onSaveProjectNotes?: (markdown: string) => Promise<void> | void;
    decisionNotes?: Record<string, Array<{
        at: string;
        content: string;
    }>>;
    onAddDecisionNote?: (decisionKey: string, content: string) => Promise<void> | void;
    /** Workspace panel props — projectName, githubRepoUrl, vercelDashUrl,
     *  vercelPreviewUrl, syncState, and onViewPendingEdits are injected by
     *  the shell. */
    workspaceProps: Omit<WorkspacePanelProps, 'projectName' | 'githubRepoUrl' | 'vercelDashUrl' | 'vercelPreviewUrl' | 'syncState' | 'onViewPendingEdits'>;
    /** Build panel props — skills is injected from the top-level prop. */
    buildProps: Omit<BuildPanelProps, 'skills'>;
    skills: SkillDescriptor[];
    schemaProps: SchemaPanelProps;
    /** Project settings panel props — dashboardUrl is injected by the shell. */
    settingsProps: Omit<AppConfigurationPanelProps, 'dashboardUrl'>;
    /** v1.2 Thread 06: catalogue + devshell-scope config + patch callback
     *  used by the "DevShell preferences" entry in the avatar menu. When
     *  omitted, the avatar menu falls back to a stub message ("DevShell
     *  preferences data is loading…"). */
    devshellPreferences?: {
        catalogue: import('@cactai-io/types').CapabilityCatalogueItem[];
        config: import('@cactai-io/types').CapabilityScopeConfig;
        onPatch: (patch: import('@cactai-io/types').CapabilityConfigPatch) => Promise<void>;
        /** Devshell-scope MCP for the Integrations tab. When present the tab
         *  renders the live MCP manager; absent → a framework-first add form. */
        mcp?: {
            servers: import('@cactai-io/types').MCPServerPublic[];
            catalog: import('../panels/MCPManager.js').MCPCatalogEntry[];
            explainer: string[];
            loading?: boolean;
            onAdd: (input: {
                label: string;
                endpoint_url: string;
                auth_type: import('@cactai-io/types').MCPAuthType;
                auth_token?: string;
            }) => Promise<void>;
            onRemove: (id: string) => Promise<void>;
            onToggle: (id: string, enabled: boolean) => Promise<void>;
        };
    };
    /** URL of the Cactai platform dashboard. Passed by the host so this
     *  package carries no hardcoded environment URL. */
    dashboardUrl: string;
    /** Rendered ReactNode for the Build tab's post-workflow slot. Hosts pass
     *  a <PrimitiveTreeRenderer> instance configured with their own tree +
     *  postEvent handler — keeping mui dependency-free of the primitives
     *  package while still letting the rich shell render orchestrator-emitted
     *  surfaces (purpose_capture, purpose_confirm, purpose_clarify,
     *  stage_step + its 24 specialized renderers, build_approval,
     *  build_progress). When null/undefined the slot stays empty. */
    buildSurfaceSlot?: ReactNode;
    /** ⓘ-guide overlay for the chat-slot region (workspace guide drops down,
     *  configuration / database slide in from the right). The host renders a
     *  <GuidePanel> here; DevShell positions it over the chat column so the
     *  slide animation is scoped to that container. Empty when no guide is open. */
    chatGuideSlot?: ReactNode;
    /** ⓘ-guide overlay for the files-panel region (file directory rises up).
     *  Same contract as chatGuideSlot, scoped to the bottom Files panel. */
    filesGuideSlot?: ReactNode;
    /** Opens the file-directory guide. Wires the ⓘ button in the Files panel
     *  header. Omit to hide the button. */
    onOpenFileGuide?: () => void;
    /** Opens the ⓘ guide for a given surface (e.g. 'library', 'studio',
     *  'schema', 'configuration'). Wires the ⓘ button on each rail panel.
     *  Right-origin guides render in the chat-slot host. Omit to hide them. */
    onOpenGuide?: (surface: string) => void;
    /** Toggles the pending-edits guide (origin modal-split). Wires the ⓘ in the
     *  PendingEditsModal header. Omit to hide it. */
    onOpenPendingGuide?: () => void;
    /** The rendered guide panel overlaid on the pending-edits modal body when
     *  the pending-edits guide is open. */
    pendingGuideSlot?: ReactNode;
    children?: ReactNode;
    onSectionChange?: (section: RailSection) => void;
    onViewChange?: (view: DevShellView) => void;
}
export declare function DevShell({ shell, projectId, projectName, branch, syncState, pendingFiles, developerInitials, developerName, agentDisplayName, agentState, character, messages, streamingContent, availableRoles, onRoleSwitch, hasPublicSignup, onCommitToDev, onRevertCommit, onDiscardPendingFile, onDiscardAllPending, onCreateFile, onRenameFile, onDeleteFile, deployBearerToken, platformBaseUrl, vercelPreviewUrl, githubRepoUrl, vercelDashUrl, treeNodes, activeFilePath, fileContent, fileLoading, onFileSelect, onExitFileView, workflowStep, workflowForm, decisions, backlog, sprints, onWorkflowFormSubmit, onRevisitDecision, onResolveBacklog, onCreateBacklog, onUpdateBacklog, onDeleteBacklog, onRenameSprint, onDeleteSprint, projectNotes, onSaveProjectNotes, decisionNotes, onAddDecisionNote, workspaceProps, buildProps, skills, schemaProps, settingsProps, devshellPreferences, dashboardUrl, apiBaseUrl, studioPreviewUrl, buildSurfaceSlot, chatGuideSlot, filesGuideSlot, onOpenFileGuide, onOpenGuide, onOpenPendingGuide, pendingGuideSlot, children, onSectionChange, onViewChange, }: DevShellProps): import("react/jsx-runtime").JSX.Element;
