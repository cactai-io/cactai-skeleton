import type { SkillDescriptor } from '../types/mui.types.js';
import type { AuthoringType } from '../authoring/AuthoringInterface.js';
export interface SchemaTable {
    name: string;
    fields: SchemaField[];
    rls_enabled: boolean;
    row_count?: number;
}
export interface SchemaField {
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
    primary?: boolean;
}
export interface MigrationRecord {
    id: string;
    name: string;
    applied_at: string;
    status: 'applied' | 'pending' | 'failed';
}
export interface MarketplaceItem {
    id: string;
    slug: string;
    display_name: string;
    description: string;
    kind: 'personality' | 'tool' | 'skill';
    price_cents: number;
    installed: boolean;
    author: string;
    semver: string;
}
export interface CredentialsRecord {
    anthropic_api_key?: string;
    github_token?: string;
    vercel_api_token?: string;
    supabase_url?: string;
    stripe_secret_key?: string;
}
import type { SyncState } from '../commit/types.js';
/** Information about a pending platform update — derived from
 *  /api/devshell/update/check. Drives the "Updates available" affordance
 *  in the workspace panel. */
export interface PlatformUpdateStatus {
    has_update: boolean;
    current_platform_sha?: string | null;
    latest_platform_sha?: string;
}
export interface WorkspacePanelProps {
    projectName: string;
    githubRepoUrl?: string;
    vercelDashUrl?: string;
    vercelPreviewUrl?: string;
    onOpenApp?: () => void;
    /** Current sync state. Drives whether the header shows the "View pending
     *  edits" button (local · N uncommitted state). */
    syncState: SyncState;
    /** Open the pending-edits modal. Called when the header button is shown. */
    onViewPendingEdits: () => void;
    /** Click handler for the ⓘ guide button next to the project name. When
     *  provided, renders the button; the host wires it to the workspace
     *  GuidePanel (origin top — drops into the chat slot). */
    onOpenGuide?: () => void;
    /** Platform update status. When has_update is true the workspace panel
     *  renders a small "Updates available" pill that opens the apply modal
     *  on click. Null/undefined hides the affordance entirely. */
    updateStatus?: PlatformUpdateStatus | null;
    /** Click handler for the Updates pill. Host opens the apply modal. */
    onOpenUpdate?: () => void;
}
export declare function WorkspacePanel({ projectName, githubRepoUrl, vercelDashUrl, vercelPreviewUrl, onOpenApp, syncState, onViewPendingEdits, onOpenGuide, updateStatus, onOpenUpdate, }: WorkspacePanelProps): import("react/jsx-runtime").JSX.Element;
export interface BuildPanelProps {
    /** Installed-tab data. */
    skills: SkillDescriptor[];
    tools: Array<{
        id: string;
        name: string;
        domain: string;
        description: string;
        active: boolean;
    }>;
    onActivateSkill: (skillId: string) => void;
    onDeactivateSkill: (skillId: string) => void;
    onBuildOwn: (type: 'skill' | 'tool') => void;
    /** Browse-tab data. All marketplace props are optional. When `items`
     *  is omitted, the BuildPanel renders the Installed view only — no
     *  tab switcher, no "Browse marketplace" affordance. This is the v1
     *  configuration while marketplace UI is deferred per
     *  sprint-prioritization memo (dev-authored skills/tools → MCP →
     *  marketplace). Reintroducing the Browse tab is a matter of
     *  passing the marketplace props again. */
    items?: MarketplaceItem[];
    loading?: boolean;
    searchQuery?: string;
    onSearch?: (q: string) => void;
    onInstall?: (itemId: string) => void;
    onUninstall?: (itemId: string) => void;
    onPublish?: () => void;
    filterKind?: 'all' | 'personality' | 'tool' | 'skill';
    onFilterKind?: (kind: NonNullable<BuildPanelProps['filterKind']>) => void;
    /** Optional initial tab. Defaults to 'installed'. Only meaningful
     *  when marketplace props are also provided. */
    initialTab?: 'installed' | 'browse';
}
export declare function BuildPanel({ skills, tools, onActivateSkill, onDeactivateSkill, onBuildOwn, items, loading, searchQuery, onSearch, onInstall, onUninstall, onPublish, filterKind, onFilterKind, initialTab, }: BuildPanelProps): import("react/jsx-runtime").JSX.Element;
export interface SchemaPanelProps {
    tables: SchemaTable[];
    migrations: MigrationRecord[];
    /** Optional. When provided, an "+ Add table" affordance renders in
     *  the section header and clicking it calls this handler. Omit if
     *  the host has no real implementation. */
    onAddTable?: () => void;
    /** Optional. When provided, an "Edit table" button renders inside
     *  each expanded table card. Omit if the host has no real
     *  implementation. */
    onEditTable?: (tableName: string) => void;
    /** Optional URL to the project's Supabase dashboard (e.g.
     *  https://supabase.com/dashboard/project/<ref>). When provided, an
     *  "Open in Supabase ↗" link renders next to the Tables header so
     *  developers can manage schema via the platform UI directly. */
    supabaseProjectUrl?: string;
}
export declare function SchemaPanel({ tables, migrations, onAddTable, onEditTable, supabaseProjectUrl }: SchemaPanelProps): import("react/jsx-runtime").JSX.Element;
import type { CapabilityCatalogueItem, CapabilityConfig, CapabilityConfigPatch, DevAuthoredPersonalityRecord, DevAuthoredPersonalityEditPatch, ProductPersonality, ProjectBYOKResponse, ProjectBYOKPatch, ProjectPersonalityResponse, ProjectPersonalityPatch, ProjectWorkflowResponse, ProjectWorkflowPatch, MCPServerPublic, MCPAuthType } from '@cactai-io/types';
import { type MCPCatalogEntry } from './MCPManager.js';
export interface AppConfigurationPanelProps {
    credentials: Partial<CredentialsRecord>;
    /** URL of the Cactai platform dashboard. Passed by the host so this
     *  package carries no hardcoded environment URL. */
    dashboardUrl: string;
    onSaveCredential: (key: keyof CredentialsRecord, value: string) => void;
    capabilityCatalogue?: CapabilityCatalogueItem[];
    capabilityConfig?: CapabilityConfig;
    onCapabilityPatch?: (patch: CapabilityConfigPatch) => Promise<void>;
    personality?: ProjectPersonalityResponse;
    onPersonalityPatch?: (patch: ProjectPersonalityPatch) => Promise<void>;
    onPersonalityLoad?: (id: string) => Promise<DevAuthoredPersonalityRecord | null>;
    onPersonalitySave?: (id: string, patch: DevAuthoredPersonalityEditPatch) => Promise<DevAuthoredPersonalityRecord>;
    onPersonalityTest?: (def: ProductPersonality, prompt?: string) => Promise<string>;
    onCreatePersonality?: () => void;
    workflow?: ProjectWorkflowResponse;
    onWorkflowPatch?: (patch: ProjectWorkflowPatch) => Promise<void>;
    byok?: ProjectBYOKResponse;
    onBYOKPatch?: (patch: ProjectBYOKPatch) => Promise<void>;
    marketplaceWorkflowsUrl?: string;
    mcpServers?: MCPServerPublic[];
    mcpCatalog?: MCPCatalogEntry[];
    mcpExplainer?: string[];
    mcpLoading?: boolean;
    onMCPAdd?: (input: {
        label: string;
        endpoint_url: string;
        auth_type: MCPAuthType;
        auth_token?: string;
    }) => Promise<void> | void;
    onMCPRemove?: (id: string) => Promise<void> | void;
    onMCPToggle?: (id: string, enabled: boolean) => Promise<void> | void;
    /** Theme editor for the Design tab. The host renders a <ThemeInspector />
     *  here (it carries projectId / apiBaseUrl / previewUrl). Migrated off the
     *  avatar-menu modal into App Configuration → Design. */
    themeInspectorSlot?: import('react').ReactNode;
    /** Deep-link to the Studio rail page with a specific authoring tool open.
     *  The Config tabs' "+ Create …" launchers call this instead of opening
     *  the authoring interface inline — authoring is anchored in Studio, not
     *  here. Supplied by the DevShell shell. */
    onOpenAuthoring?: (type: AuthoringType) => void;
    /** Live role catalog (customer DB tenant_roles_catalog) for the Roles tab.
     *  When present the tab views + adjusts the real seeded catalog; when
     *  absent it shows the seed-default preview. */
    roleCatalog?: RoleCatalogEntry[];
    /** Persist a single role's editable fields. */
    onRolePatch?: (patch: RolePatch) => Promise<void>;
    /** Per-agent enable/disable overrides (customer DB app_agent_config).
     *  Sparse: an agent absent from the map is enabled. */
    agentConfig?: Record<string, boolean>;
    /** Persist one agent's enabled state. */
    onAgentToggle?: (agentId: string, enabled: boolean) => Promise<void>;
    /** AI keys policy + per-provider budgets (customer DB app_ai_keys_policy
     *  + app_provider_policy) for the AI tab. */
    aiPolicy?: AIKeysPolicyState;
    /** Persist the global policy and/or one provider's override. */
    onAIPolicyPatch?: (patch: AIPolicyPatch) => Promise<void>;
}
export interface AIKeysPolicyState {
    global_policy: 'included' | 'byok';
    providers: Record<string, {
        policy: 'included' | 'byok' | null;
        budget: number | null;
        team_keys: boolean;
    }>;
}
export interface AIPolicyPatch {
    global_policy?: 'included' | 'byok';
    provider?: {
        provider_id: string;
        policy?: 'included' | 'byok' | null;
        budget?: number | null;
        team_keys?: boolean;
    };
}
export interface RoleCatalogEntry {
    role: string;
    label: string;
    rank: number;
    description: string;
    is_default: boolean;
    capabilities: string[];
}
export interface RolePatch {
    role: string;
    label?: string;
    rank?: number;
    capabilities?: string[];
}
export declare function AppConfigurationPanel({ credentials, dashboardUrl, onSaveCredential, capabilityCatalogue, capabilityConfig, onCapabilityPatch, personality, onPersonalityPatch, onPersonalityLoad, onPersonalitySave, onPersonalityTest, onCreatePersonality, workflow, onWorkflowPatch, byok, onBYOKPatch, marketplaceWorkflowsUrl, mcpServers, mcpCatalog, mcpExplainer, mcpLoading, onMCPAdd, onMCPRemove, onMCPToggle, themeInspectorSlot, onOpenAuthoring, roleCatalog, onRolePatch, agentConfig, onAgentToggle, aiPolicy, onAIPolicyPatch, }: AppConfigurationPanelProps): import("react/jsx-runtime").JSX.Element;
