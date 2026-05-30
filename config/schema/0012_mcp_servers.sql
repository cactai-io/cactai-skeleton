-- 0012_mcp_servers.sql
-- v1.4 — Per-end-user MCP (Model Context Protocol) server registry.
--
-- The skeleton's deployed app lets each end user attach their own MCP
-- servers (their personal Notion, Linear, Postgres, etc.) so their
-- AI agent gains access to tools/resources from systems they already
-- trust. Each row is scoped to a single end user (app_users.id);
-- per-project + per-developer MCP servers live in
-- project_state.decisions.mcp_servers.{devshell|app_default}[] as
-- JSONB on the existing project_state row — no new table needed for
-- those scopes.
--
-- Auth tokens are envelope-encrypted via the shared
-- SECRETS_ENCRYPTION_KEY (same v2 envelope as BYOK + provider keys);
-- the plaintext never leaves the server-side route that's about to
-- open the outbound SSE connection.
--
-- Capability cache: the JSONB column holds the last-known tools +
-- resources + prompts list from the server's `initialize` handshake.
-- Refreshed at session start; in-session refresh follows MCP's
-- notifications/tools/list_changed (and siblings) per the protocol.
--
-- RLS: ENABLE with no explicit policy — these rows are accessed via
-- the skeleton's /api/mcp/servers route which runs under the
-- service-role client (so RLS is bypassed for the legitimate caller);
-- end users cannot reach the table directly. Same access model as
-- pending_files + every other dev-tooling table.

CREATE TABLE IF NOT EXISTS end_user_mcp_servers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
                 -- Human-readable label shown in the /operate/mcp UI
                 -- (e.g. "My Notion", "Acme Linear"). Not unique —
                 -- duplicate labels are allowed; uniqueness is on
                 -- (user_id, endpoint_url) below.
  endpoint_url   TEXT NOT NULL,
                 -- Full SSE endpoint URL (https only enforced in route).
                 -- MCP supports stdio + ws + sse; v1 is sse-only since
                 -- we don't run user-supplied processes on the hosted
                 -- runtime (architectural decision — see
                 -- mcp-integration-architecture memo).
  auth_type      TEXT NOT NULL DEFAULT 'none'
                 CHECK (auth_type IN ('none', 'bearer', 'oauth')),
                 -- 'oauth' is reserved — v1 ships bearer-only;
                 -- built-in OAuth broker is v1.1 (memo).
  auth_token     TEXT,
                 -- v2 envelope-encrypted bearer token or OAuth access
                 -- token. NULL when auth_type='none'. Plaintext is
                 -- accepted at PATCH time over TLS, encrypted in
                 -- the same handler before write.
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  capabilities   JSONB,
                 -- Cached capability list from the last successful
                 -- handshake: { tools: [...], resources: [...],
                 -- prompts: [...] }. Stale-tolerant; the connection
                 -- orchestrator re-reads at session start and listens
                 -- for in-session change notifications.
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint_url)
);

CREATE INDEX IF NOT EXISTS idx_end_user_mcp_servers_user
  ON end_user_mcp_servers (user_id, enabled);

ALTER TABLE end_user_mcp_servers ENABLE ROW LEVEL SECURITY;

-- updated_at auto-bump trigger — same pattern as other customer-DB
-- tables (dev_sprints, app_users). Saves the route from setting it
-- explicitly on every PATCH.
CREATE OR REPLACE FUNCTION bump_end_user_mcp_servers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_end_user_mcp_servers_updated_at ON end_user_mcp_servers;
CREATE TRIGGER trg_end_user_mcp_servers_updated_at
  BEFORE UPDATE ON end_user_mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION bump_end_user_mcp_servers_updated_at();
