-- 0014_agent_config.sql
-- Per-app enable/disable state for the agents that power the app.
--
-- The App Configuration → Agents tab lists the built-in agents (GAS
-- Orchestration Agent, MUI Rendering Agent, the provider-native coding
-- agents) plus any the developer authors. This table stores only the
-- developer's overrides: an agent absent from the table is treated as
-- ENABLED, so the default posture (everything on) needs no seed rows.

CREATE TABLE IF NOT EXISTS app_agent_config (
  agent_id    TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_agent_config ENABLE ROW LEVEL SECURITY;

-- Authenticated readers may see the config (the app needs to know which
-- agents are active). Writes go through the platform's service-role
-- connection from the DevShell, never directly from end users.
DROP POLICY IF EXISTS app_agent_config_read ON app_agent_config;
CREATE POLICY app_agent_config_read ON app_agent_config
  FOR SELECT
  TO authenticated
  USING (TRUE);

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0014_agent_config.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
