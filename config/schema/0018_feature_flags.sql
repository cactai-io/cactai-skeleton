-- 0018_feature_flags.sql
-- App-wide feature flags — the runtime store behind the prune/flag model.
--
-- A capability the developer chose to KEEP (rather than Remove) ships with a
-- row here and a gate (`featureEnabled('key')`) in its code. The developer
-- toggles it from App Configuration with NO rebuild: App Config writes the
-- row via the platform's service-role connection, and the app reads it at
-- runtime (src/lib/features.ts). A REMOVED capability has its files, its gate,
-- and its row all deleted. A missing row falls back to the registry default
-- in src/lib/features.ts (so the app never depends on a row existing).
--
-- App-wide (not per-user): same value for every end user. Mirrors the
-- app_provider_policy pattern — read by any authenticated user, written only
-- through DevShell's service-role connection.

CREATE TABLE IF NOT EXISTS app_feature_flags (
  flag_key   TEXT PRIMARY KEY,
  enabled    BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_feature_flags ENABLE ROW LEVEL SECURITY;

-- Readable by authenticated users (the app's gates need the values);
-- writes go through the platform's service-role connection from DevShell.
DROP POLICY IF EXISTS app_feature_flags_read ON app_feature_flags;
CREATE POLICY app_feature_flags_read ON app_feature_flags
  FOR SELECT TO authenticated USING (TRUE);

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0018_feature_flags.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
