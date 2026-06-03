-- 0006_role_catalog.sql
-- Data-driven role catalog. Replaces the previous hardcoded
-- (super_admin, admin, user) enumeration in skeleton TypeScript code.
--
-- Schema-level enforcement on tenant_members.role remains in place via the
-- existing CHECK constraint in 0001_initial.sql; this catalog adds a sibling
-- list that the skeleton lens helpers read at runtime to determine which
-- roles exist, their ranks, and their labels.
--
-- To add a new role:
--   1. Author a new migration file (e.g. 0007_role_moderator.sql) that
--      INSERTs a row here.
--   2. ALTER TABLE tenant_members to update its CHECK constraint if the
--      new role isn't already permitted by the constraint. (The seed
--      constraint in 0001 allows the three defaults only; adding new roles
--      requires updating it.)
--   3. The runner picks this up on next deploy; the skeleton's lens helpers
--      see the new role immediately.

CREATE TABLE IF NOT EXISTS tenant_roles_catalog (
  role         TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  rank         INTEGER NOT NULL,
  description  TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_roles_catalog_rank_idx
  ON tenant_roles_catalog(rank DESC);

ALTER TABLE tenant_roles_catalog ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the catalog (the skeleton needs it for
-- lens-switcher UI).
DROP POLICY IF EXISTS tenant_roles_catalog_read ON tenant_roles_catalog;
CREATE POLICY tenant_roles_catalog_read ON tenant_roles_catalog
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Seed the three defaults. Rank ordering: higher rank = more privileged.
-- The skeleton's lens-resolver uses this when a user holds multiple roles
-- and no claim is set.
INSERT INTO tenant_roles_catalog (role, label, rank, description, is_default) VALUES
  ('user',        'User',        0, 'End-user of the application.',                                              TRUE),
  ('admin',       'Admin',       1, 'Tenant administrator. Can manage users and tenant-scoped configuration.',  TRUE),
  ('super_admin', 'Super-admin', 2, 'Tenant owner. Full control of the tenant including admin assignments.',     TRUE)
ON CONFLICT (role) DO NOTHING;

-- Helper function used by the skeleton's supabase.server.ts to apply a
-- per-request lens override to the database session. set_config(..., true)
-- is transaction-local — compatible with pooled connections.
--
-- Security: this function is callable by any authenticated user and only
-- sets a single session GUC. RLS policies that read current_setting do
-- their own privilege checks against tenant_members; setting the GUC
-- doesn't grant access by itself.
CREATE OR REPLACE FUNCTION set_active_lens(lens TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.active_lens', lens, true);
END;
$$;

REVOKE ALL ON FUNCTION set_active_lens(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_active_lens(TEXT) TO authenticated, service_role;

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0006_role_catalog.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
