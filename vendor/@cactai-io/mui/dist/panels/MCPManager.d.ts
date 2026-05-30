import type { MCPServerPublic, MCPAuthType } from '@cactai-io/types';
export interface MCPCatalogEntry {
    id: string;
    label: string;
    description: string;
    endpoint_url: string;
    auth_type: MCPAuthType;
    glyph?: string;
}
export interface MCPManagerProps {
    /** Heading shown above the explainer. */
    title: string;
    /** Location-specific explainer copy — what MCP is for HERE. Plain
     *  strings; rendered as paragraphs. */
    explainer: string[];
    /** Catalog of common integrations for this location. */
    catalog: MCPCatalogEntry[];
    /** Currently-connected servers (persisted, inert this sprint). */
    servers: MCPServerPublic[];
    /** True while the initial list is loading. */
    loading?: boolean;
    /** Add a server. Catalog "Connect" calls this with the catalog
     *  entry's prefilled values; the custom form calls it with
     *  user-entered values. */
    onAdd: (input: {
        label: string;
        endpoint_url: string;
        auth_type: MCPAuthType;
        auth_token?: string;
    }) => Promise<void> | void;
    /** Remove a connected server by id. */
    onRemove: (id: string) => Promise<void> | void;
    /** Enable/disable a connected server. */
    onToggle: (id: string, enabled: boolean) => Promise<void> | void;
    /** Optional last-error string surfaced inline (host owns fetch error
     *  state; this just renders it). */
    error?: string | null;
}
export declare function MCPManager({ title, explainer, catalog, servers, loading, onAdd, onRemove, onToggle, error, }: MCPManagerProps): import("react/jsx-runtime").JSX.Element;
