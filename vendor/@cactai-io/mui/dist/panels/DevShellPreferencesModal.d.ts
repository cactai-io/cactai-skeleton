import { type MCPCatalogEntry } from './MCPManager.js';
import type { CapabilityCatalogueItem, CapabilityScopeConfig, CapabilityConfigPatch, MCPServerPublic, MCPAuthType } from '@cactai-io/types';
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
}
export declare function DevShellPreferencesModal({ catalogue, config, onPatch, onClose, variant, mcp }: DevShellPreferencesModalProps): import("react/jsx-runtime").JSX.Element;
