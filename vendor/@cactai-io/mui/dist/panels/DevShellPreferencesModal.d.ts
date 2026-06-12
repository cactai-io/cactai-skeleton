import { type MCPCatalogEntry } from './MCPManager.js';
import { type ProviderModelValue } from './ProviderModelPanel.js';
import type { CapabilityCatalogueItem, CapabilityScopeConfig, CapabilityConfigPatch, MCPServerPublic, MCPAuthType, ProjectBYOKResponse, ProjectBYOKPatch, ProjectPersonalityResponse } from '@cactai-io/types';
export interface DevShellMcpConfig {
    servers: MCPServerPublic[];
    catalog: MCPCatalogEntry[];
    explainer: string[];
    loading?: boolean;
    onAdd: (input: {
        label: string;
        endpoint_url: string;
        auth_type: MCPAuthType;
        auth_token?: string;
    }) => Promise<void> | void;
    onRemove: (id: string) => Promise<void> | void;
    onToggle: (id: string, enabled: boolean) => Promise<void> | void;
}
export interface DevShellPreferencesModalProps {
    catalogue: CapabilityCatalogueItem[];
    config: CapabilityScopeConfig;
    onPatch: (patch: CapabilityConfigPatch) => Promise<void>;
    onClose: () => void;
    /** 'modal' (legacy overlay) or 'page' (full-page main-area view). The
     *  DevShell mounts this as a 'page' inside the workspace content area;
     *  'modal' is kept for any incidental overlay use. */
    variant?: 'modal' | 'page';
    /** Devshell-scope MCP for the Integrations tab. When present the tab
     *  renders the live MCP manager; absent → the framework-first add form. */
    mcp?: DevShellMcpConfig;
    /** DevShell-scope BYOK keys for the Providers tab. The blob the wizard
     *  seeded (and the developer edits here); onBYOKPatch persists a key. */
    byok?: ProjectBYOKResponse | null;
    onBYOKPatch?: (patch: ProjectBYOKPatch) => Promise<void> | void;
    /** Shared personality list (same as App Config). The DevShell chat's
     *  personality is an INDEPENDENT selection stored locally
     *  (cactai_devshell_personality), so the IDE assistant and the app's
     *  assistant can differ. Built-ins + developer-authored both appear. */
    personality?: ProjectPersonalityResponse | null;
    /** Per-provider chat_model + generative_model picks. Hydrated by the
     *  host from GET /devshell/model-selections and persisted via
     *  PATCH /devshell/model-selections (project_state.decisions.model_selections_v1). */
    modelSelections?: Partial<ProviderModelValue>;
    onModelSelectionsChange?: (next: ProviderModelValue) => void;
}
export declare function DevShellPreferencesModal({ catalogue, config, onPatch, onClose, variant, mcp, byok, onBYOKPatch, personality, modelSelections, onModelSelectionsChange }: DevShellPreferencesModalProps): import("react/jsx-runtime").JSX.Element;
