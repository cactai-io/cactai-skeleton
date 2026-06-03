-- 0016_tiers.sql
-- Pricing/access tiers + per-tier per-provider budgets for the App
-- Configuration → Tiers tab (keys-budgets-team-policy dependency chain:
-- providers → roles → tiers → budgets-per-tier-per-Included-provider).
--
--   app_tiers         — the tier list (seeded with the 3-tier default).
--   app_tier_budgets  — sparse (tier, provider) → budget in provider-native
--                       units. A pair absent here is unset (effectively 0).

CREATE TABLE IF NOT EXISTS app_tiers (
  tier_id     TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  rank        INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_tier_budgets (
  tier_id     TEXT NOT NULL REFERENCES app_tiers(tier_id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  budget      BIGINT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tier_id, provider_id)
);

ALTER TABLE app_tiers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_tier_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_tiers_read ON app_tiers;
CREATE POLICY app_tiers_read ON app_tiers
  FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS app_tier_budgets_read ON app_tier_budgets;
CREATE POLICY app_tier_budgets_read ON app_tier_budgets
  FOR SELECT TO authenticated USING (TRUE);

-- Seed the 3-tier default (the build workflow can replace these). Ranks
-- low→high by access level.
INSERT INTO app_tiers (tier_id, label, rank) VALUES
  ('free',       'Free',       0),
  ('pro',        'Pro',        1),
  ('enterprise', 'Enterprise', 2)
ON CONFLICT (tier_id) DO NOTHING;

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0016_tiers.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
