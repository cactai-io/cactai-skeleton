import type { MCPCatalogEntry } from './MCPManager.js';
export declare const FLEET_CATALOG: MCPCatalogEntry[];
export declare const DEVSHELL_CATALOG: MCPCatalogEntry[];
export declare const APP_DEFAULT_CATALOG: MCPCatalogEntry[];
export declare const END_USER_CATALOG: MCPCatalogEntry[];
export declare const MCP_CATALOGS: {
    readonly fleet: MCPCatalogEntry[];
    readonly devshell: MCPCatalogEntry[];
    readonly app_default: MCPCatalogEntry[];
    readonly end_user: MCPCatalogEntry[];
};
export declare const MCP_EXPLAINERS: {
    readonly fleet: readonly ["Connect the tools you run your business on. MCP lets Cactai exchange data with your accounting, planning, analytics, and ops systems — across every project you build here.", "For example: export your usage and revenue into your accounting tool, or pull roadmap items from your planning app."];
    readonly devshell: readonly ["Connect the tools for building this project. The assistant helping you build can pull context from your repo, issue tracker, database, designs, and docs.", "These connections are scoped to this project only."];
    readonly app_default: readonly ["Connect tools your deployed app should use for every end user. Wire in a knowledge base, CRM, or ticketing system once and every user of your app benefits automatically.", "End users can also connect their own personal tools — that’s managed separately, by each user."];
    readonly end_user: readonly ["Connect your own tools so the assistant can work with the accounts you already use — your Notion, Drive, calendar, and more.", "These connections are private to you and used only in your own sessions."];
};
