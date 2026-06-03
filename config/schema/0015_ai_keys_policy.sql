-- 0015_ai_keys_policy.sql
-- App-level AI keys policy + per-provider budgets for the App Configuration
-- → AI tab (keys-budgets-team-policy: Included / BYOK / Hybrid).
--
-- Two tables:
--   app_ai_keys_policy  — singleton row holding the app-wide default policy.
--                         Default BYOK (no surprise billing).
--   app_provider_policy — sparse per-provider overrides + budgets. A
--                         provider absent here inherits the global policy,
--                         has no budget, and team-keys off. "Hybrid" is not
--                         stored — it's derived UI state (any override set).

-- Singleton global default. The CHECK (id) keeps the table to one row.
CREATE TABLE IF NOT EXISTS app_ai_keys_policy (
  id             BOOLEAN PRIMARY KEY DEFAULT TRUE,
  global_policy  TEXT NOT NULL DEFAULT 'byok' CHECK (global_policy IN ('included', 'byok')),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_ai_keys_policy_singleton CHECK (id = TRUE)
);

-- Per-provider overrides. policy NULL = inherit the global default.
CREATE TABLE IF NOT EXISTS app_provider_policy (
  provider_id  TEXT PRIMARY KEY,
  policy       TEXT CHECK (policy IS NULL OR policy IN ('included', 'byok')),
  budget       BIGINT,                         -- provider-native units; NULL = unset
  team_keys    BOOLEAN NOT NULL DEFAULT FALSE, -- "use DevShell keys for team testing"
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_ai_keys_policy  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_provider_policy ENABLE ROW LEVEL SECURITY;

-- Readable by authenticated users (the app's key-resolver needs the policy);
-- writes go through the platform's service-role connection from DevShell.
DROP POLICY IF EXISTS app_ai_keys_policy_read ON app_ai_keys_policy;
CREATE POLICY app_ai_keys_policy_read ON app_ai_keys_policy
  FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS app_provider_policy_read ON app_provider_policy;
CREATE POLICY app_provider_policy_read ON app_provider_policy
  FOR SELECT TO authenticated USING (TRUE);

-- Seed the singleton row so reads always find a global default.
INSERT INTO app_ai_keys_policy (id, global_policy) VALUES (TRUE, 'byok')
ON CONFLICT (id) DO NOTHING;

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0015_ai_keys_policy.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
