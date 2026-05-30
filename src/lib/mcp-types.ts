// src/lib/mcp-types.ts
//
// Local MCP type declarations for the skeleton.
//
// These mirror the canonical definitions in @cactai-io/types/projectConfig.types.ts.
// We declare them locally because the published @cactai-io/types@1.3.10
// pre-dates the v1.4 MCP work and the skeleton can't depend on an
// unpublished workspace version. When @cactai-io/types is bumped to
// ship the MCP types, swap these imports back to '@cactai-io/types'
// and delete this file.

export type MCPScope    = 'platform' | 'devshell' | 'app_default' | 'end_user';
export type MCPAuthType = 'none' | 'bearer' | 'oauth';

export interface MCPCapabilities {
  tools:     Array<{ name: string; description?: string }>;
  resources: Array<{ name: string; description?: string }>;
  prompts:   Array<{ name: string; description?: string }>;
}

export interface MCPServerPublic {
  id:            string;
  label:         string;
  endpoint_url:  string;
  auth_type:     MCPAuthType;
  auth_set:      boolean;
  enabled:       boolean;
  capabilities?: MCPCapabilities;
  created_at:    string;
  updated_at:    string;
}

export interface MCPServerInput {
  label?:        string;
  endpoint_url?: string;
  auth_type?:    MCPAuthType;
  auth_token?:   string | null;
  enabled?:      boolean;
}
