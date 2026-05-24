import type { SkillDescriptor } from '../types/mui.types.js';
export interface CollaboratorRecord {
    id: string;
    developer_id: string;
    display_name: string;
    email: string;
    github_username?: string;
    permissions: {
        code_tree: string[];
        schema_tools: boolean;
        settings: boolean;
    };
    accepted_at?: string;
}
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
}
export declare function WorkspacePanel({ projectName, githubRepoUrl, vercelDashUrl, vercelPreviewUrl, onOpenApp, syncState, onViewPendingEdits, }: WorkspacePanelProps): import("react/jsx-runtime").JSX.Element;
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
    /** Browse-tab data. */
    items: MarketplaceItem[];
    loading: boolean;
    searchQuery: string;
    onSearch: (q: string) => void;
    onInstall: (itemId: string) => void;
    onUninstall: (itemId: string) => void;
    onPublish: () => void;
    filterKind: 'all' | 'personality' | 'tool' | 'skill';
    onFilterKind: (kind: BuildPanelProps['filterKind']) => void;
    /** Optional initial tab. Defaults to 'installed'. The shell may pass
     *  'browse' when the user landed here from a "Browse marketplace" link
     *  elsewhere in the IDE. */
    initialTab?: 'installed' | 'browse';
}
export declare function BuildPanel({ skills, tools, onActivateSkill, onDeactivateSkill, onBuildOwn, items, loading, searchQuery, onSearch, onInstall, onUninstall, onPublish, filterKind, onFilterKind, initialTab, }: BuildPanelProps): import("react/jsx-runtime").JSX.Element;
export interface SchemaPanelProps {
    tables: SchemaTable[];
    migrations: MigrationRecord[];
    onAddTable: () => void;
    onEditTable: (tableName: string) => void;
}
export declare function SchemaPanel({ tables, migrations, onAddTable, onEditTable }: SchemaPanelProps): import("react/jsx-runtime").JSX.Element;
import type { CapabilityCatalogueItem, CapabilityConfig, CapabilityConfigPatch, DevAuthoredPersonalityRecord, DevAuthoredPersonalityEditPatch, ProductPersonality, ProjectBYOKResponse, ProjectBYOKPatch, ProjectPersonalityResponse, ProjectPersonalityPatch, ProjectWorkflowResponse, ProjectWorkflowPatch } from '@cactai-io/types';
export interface ProjectSettingsPanelProps {
    credentials: Partial<CredentialsRecord>;
    billingEnabled: boolean;
    collaborators: CollaboratorRecord[];
    /** URL of the Cactai platform dashboard. White-label operators MUST pass
     *  their own. No default. */
    dashboardUrl: string;
    onSaveCredential: (key: keyof CredentialsRecord, value: string) => void;
    onInviteCollaborator: (email: string) => void;
    onRemoveCollaborator: (id: string) => void;
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
}
export declare function ProjectSettingsPanel({ credentials, billingEnabled, collaborators, dashboardUrl, onSaveCredential, onInviteCollaborator, onRemoveCollaborator, capabilityCatalogue, capabilityConfig, onCapabilityPatch, personality, onPersonalityPatch, onPersonalityLoad, onPersonalitySave, onPersonalityTest, onCreatePersonality, workflow, onWorkflowPatch, byok, onBYOKPatch, marketplaceWorkflowsUrl, }: ProjectSettingsPanelProps): import("react/jsx-runtime").JSX.Element;
