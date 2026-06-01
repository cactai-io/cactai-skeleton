// packages/mui/src/index.ts
// Public API surface for @cactai-io/mui.
// @cactai-io/mui is Cactai internal — never distributed.
// Import rules: @cactai-io/mui imports from @cactai-io/types and @cactai-io/client.
// Shell — primary entry point
export { MUIShell } from './shell/MUIShell.js';
// Store
export { MUIStore } from './store/MUIStore.js';
// Agent
export { MUIAgent } from './agent/MUIAgent.js';
// Generation pipeline
export { SkillRegistry } from './generation/SkillRegistry.js';
export { SkillComposer } from './generation/SkillComposer.js';
export { GenerativeFallback } from './generation/GenerativeFallback.js';
export { ComplexityAssessor } from './generation/ComplexityAssessor.js';
export { SkillAutoRegistrar } from './generation/SkillAutoRegistrar.js';
// Stream and input
export { StreamController } from './stream/StreamController.js';
export { InputRouter } from './input/InputRouter.js';
// Surfaces
export { SurfaceRegistry } from './surfaces/SurfaceRegistry.js';
export { ChatSurface } from './surfaces/ChatSurface.js';
export { SupportingSurface } from './surfaces/SupportingSurface.js';
// Components
export { MessageFeed } from './components/MessageFeed.js';
export { MessageBubble } from './components/MessageBubble.js';
export { StreamingBubble } from './components/StreamingBubble.js';
export { PendingIndicator } from './components/PendingIndicator.js';
export { ArtifactCard } from './components/ArtifactCard.js';
export { HandoffBanner } from './components/HandoffBanner.js';
export { ErrorDisplay } from './components/ErrorDisplay.js';
export { ChatInput } from './components/ChatInput.js';
export { SandboxedRenderer } from './components/SandboxedRenderer.js';
// Code safety analyzer — exposed for consumers who want to run their own
// pre-flight check on generated code (e.g. before persisting it).
export { analyzeGeneratedCode } from './generation/CodeSafetyAnalyzer.js';
// Renderers
export { TextRenderer } from './renderers/TextRenderer.js';
export { ArtifactRenderer } from './renderers/ArtifactRenderer.js';
export { ErrorRenderer } from './renderers/ErrorRenderer.js';
// Security
export { createSandboxedFrame, generateNonce, themeToCSS, validateEscalation } from './security/SecurityLayer.js';
// Hooks
export { useMUIStore, useMUIStoreSelector } from './hooks/useMUIStore.js';
export { useStream } from './hooks/useStream.js';
export { useGASSession } from './hooks/useGASSession.js';
// Studio overlay and SDK manifest
export { StudioOverlay } from './components/StudioOverlay.js';
export { SDK_MANIFEST, getManifestJSON } from './sdk-manifest.js';
// DevShell full exports
export { DevShell } from './shell/DevShell.js';
export { injectDevShellStyles, DEVSHELL_CSS } from './shell/DevShellStyles.js';
// Character system
export { CharacterRenderer, morphToMood, moodToAnimationClass } from './characters/CharacterRenderer.js';
export { OwlCharacter, OWL_CHARACTER } from './characters/OwlCharacter.js';
export { RobotCharacter, ROBOT_CHARACTER } from './characters/RobotCharacter.js';
export { PrairieDogCharacter, PRAIRIE_DOG_CHARACTER } from './characters/PrairieDogCharacter.js';
// Dev chat panel
export { DevChatPanel } from './components/DevChatPanel.js';
// File tree
export { FileTree } from './components/FileTree.js';
// Commit feature — SyncState, indicator, modal. The DevShell wires these
// internally; consumers re-export them for white-label IDEs that want to
// embed the commit affordances outside DevShell's chrome.
// v1.2 commit-flow rebuild: the CommitToMainModal and its props re-export
// are gone — developers merge dev to main manually in GitHub. The new
// CommitHistoryModal, DeployIndicator, DiffViewer, RoleViewBanner,
// MonacoFileEditor, and FileConflictModal are re-exported here so
// white-label IDEs can compose them too.
export { SyncIndicator } from './commit/SyncIndicator.js';
export { PendingEditsModal } from './commit/PendingEditsModal.js';
export { CommitHistoryModal, COMMIT_HISTORY_PAGE_SIZE } from './commit/CommitHistoryModal.js';
export { CommitConflictModal, CommitConflictError } from './commit/CommitConflictModal.js';
// Host-agnostic commit + revert helpers. Hosts (the Cactai platform's
// DevShell shim today; third-party IDEs tomorrow) call these from
// their `onCommitToDev` / `onRevertCommit` implementations so every
// integrator gets the same wire-format behavior. Thread 11 + 12.
export { buildCommitBody, sendCommit, buildRevertFileSet, defaultRevertMessage, } from './commit/commitClient.js';
export { DeployIndicator } from './commit/DeployIndicator.js';
// v1.3 Phase 7 — directory viewer header surfaces.
export { BranchIndicator } from './commit/BranchIndicator.js';
// v1.3 Phase 7 — Gap 127: auto-generated commit message logic for the
// commit panel's default value. Pure functions; no side effects.
export { autoGenerateCommitMessage } from './commit/autoMessage.js';
export { isLocal, isSyncedToDev, pendingCount, formatSyncLabel, deriveSyncState, previewBehaviorFor, } from './commit/types.js';
// v1.3 Phase 8 — viewer auto-refresh controller (Gap 148). Listens to
// deploy events and reloads the iframe with interaction-aware debounce
// (3s after last interaction; 30s hard cap).
export { useViewerAutoRefresh, ViewerRefreshController, } from './viewer/ViewerRefreshController.js';
// v1.3 Phase 14 — AI Model Selection panel + sprint review per-task
// override + complexity escalation prompt. The model-selection panel
// renders one row per Agent SDK task type (Haiku / Sonnet / Opus) in
// both DevShell settings + the developer's operator shell. The sprint
// override is consumed by Phase 15's sprint review panel.
export { ModelSelectionPanel, PANEL_DEFAULT_SELECTIONS } from './agent/ModelSelectionPanel.js';
export { SprintReviewModelOverride } from './agent/SprintReviewModelOverride.js';
export { ComplexityEscalationPrompt } from './agent/ComplexityEscalationPrompt.js';
// v1.3 Phase 13 — click-to-select. The bridge between the live preview
// iframe and the source surfaces (directory viewer + chat). Host
// wraps the consumer tree in SelectionContextProvider and mounts the
// ClickToSelectOverlay in the viewer header.
export { SelectionContextProvider, useSelection, useSelectionEffect, AUTO_DISMISS_AFTER, } from './viewer/SelectionContext.js';
export { ClickToSelectOverlay } from './viewer/ClickToSelectOverlay.js';
export { isInspectMessage, isIframeToParent, isParentToIframe, isAcceptableOrigin, } from './viewer/inspectProtocol.js';
// Diff viewer — shared between the pending-edits modal, commit-history
// modal, and the Monaco editor's diff toggle.
export { DiffViewer, clearDiffViewerCache, languageForPath } from './diff/DiffViewer.js';
// Role-view banner — pending non-config code edits warning.
export { RoleViewBanner } from './role/RoleViewBanner.js';
// Monaco editor + file-conflict modal. Lazy-imports Monaco so the
// package stays slim until first editor mount.
export { MonacoFileEditor } from './editor/MonacoFileEditor.js';
export { FileConflictModal } from './editor/FileConflictModal.js';
// Staging module — client-side pending_files manager. The DevShell
// constructs one instance per project at mount, hands it to the modal +
// editor + chat SSE handler via React context. White-label IDEs that
// embed pieces of the commit affordance can also re-use this directly.
export { PendingFilesManager, setActivePendingFilesManager, getActivePendingFilesManager, diffLineCounts, } from './staging/PendingFilesManager.js';
// Panels
// v1.1 IA: BuildPanel replaces the old Capabilities + Marketplace pair;
// ProjectSettingsPanel is the canonical name for the project-settings panel.
// v1.2 adds CapabilityListPanel (tools/skills), PersonalityPickerPanel +
// PersonalityEditor (Thread 07), WorkflowSection + BYOKSection
// (Thread 08), and DevShellPreferencesModal (Thread 06 Surface 2).
export { WorkspacePanel, BuildPanel, SchemaPanel, ProjectSettingsPanel, } from './panels/index.js';
export { CapabilityListPanel } from './panels/CapabilityListPanel.js';
export { PersonalityPickerPanel } from './panels/PersonalityPickerPanel.js';
export { PersonalityEditor } from './panels/PersonalityEditor.js';
export { OnboardingModal } from './panels/OnboardingModal.js';
export { WorkflowCompletionModal } from './panels/WorkflowCompletionModal.js';
export { MCPManager } from './panels/MCPManager.js';
export { MCP_CATALOGS, MCP_EXPLAINERS } from './panels/mcpCatalogs.js';
export { WorkflowSection } from './panels/WorkflowSection.js';
export { BYOKSection } from './panels/BYOKSection.js';
export { DevShellPreferencesModal } from './panels/DevShellPreferencesModal.js';
// Workflow
export { WorkflowSurface, DecisionLog, DecisionInput, GoalBacklog, SprintOverview, ButtonSelect, DragRank, ColorPicker, PersonalityCards, } from './workflow/index.js';
// Theme Inspector
export { ThemeInspector, ColorControl, FontControl, NumericControl, ShadowControl, TransitionControl, inferControlKind, } from './inspector/index.js';
//# sourceMappingURL=index.js.map