-- 0008_role_capabilities.sql
-- v1.3 — Cumulative capability model on tenant_roles_catalog.
--
-- Per v1.3 locked decisions, the role capability model is cumulative
-- (HubSpot-style):
--   user        : baseline capabilities
--   admin       : user's capabilities + admin-only additions
--   super_admin : admin's capabilities + super_admin-only additions
--
-- The cumulative invariant is maintained at WRITE time by the DevShell role
-- editor (which propagates additions downstream and removals upstream when
-- the dev edits a role's capabilities). The stored value is the FULL
-- cumulative list — readers do a single membership check, no walk.
--
-- The capability vocabulary below is a v1.3 default seed. Devs override via
-- the DevShell role editor; their changes write to this same column.

BEGIN;

-- ── Add capabilities column ──────────────────────────────────────────────────
ALTER TABLE tenant_roles_catalog
  ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(capabilities) = 'array');

-- ── Seed default cumulative capabilities ─────────────────────────────────────
-- Capabilities are atomic permission tokens. Names use snake_case for
-- consistency with route/RLS conventions.
--
-- The seed assumes the three default roles ('user','admin','super_admin')
-- already exist (inserted in 0006). ON CONFLICT DO UPDATE preserves the
-- cumulative model on re-run.
INSERT INTO tenant_roles_catalog (role, label, rank, description, is_default, capabilities)
VALUES
  ('user',        'User',        0,
   'End-user of the application.',
   TRUE,
   '["read_own_data", "update_own_profile"]'::jsonb),

  ('admin',       'Admin',       1,
   'Tenant administrator. Can manage users and tenant-scoped configuration.',
   TRUE,
   '["read_own_data", "update_own_profile", "read_tenant_users", "invite_user", "suspend_user", "manage_tenant_settings"]'::jsonb),

  ('super_admin', 'Super-admin', 2,
   'Tenant owner. Full control of the tenant including admin assignments.',
   TRUE,
   '["read_own_data", "update_own_profile", "read_tenant_users", "invite_user", "suspend_user", "manage_tenant_settings", "promote_admin", "demote_admin", "change_billing", "transfer_ownership", "delete_tenant_data"]'::jsonb)
ON CONFLICT (role) DO UPDATE
  SET capabilities = EXCLUDED.capabilities,
      description  = EXCLUDED.description
  WHERE tenant_roles_catalog.capabilities = '[]'::jsonb;
-- The WHERE clause means we only seed capabilities when the existing row
-- has none. A dev who has customized their catalog via DevShell won't have
-- their work overwritten on re-run.

-- ── Helper function for capability checks in RLS ────────────────────────────
-- Usage:
--   USING ( current_active_role_has_capability('invite_user') )
--
-- Reads app.active_lens (set per-request by the skeleton's session resolver)
-- and looks up the cumulative capabilities for that role.
CREATE OR REPLACE FUNCTION current_active_role_has_capability(capability TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  lens TEXT;
  caps JSONB;
BEGIN
  -- Read the lens GUC; missing or empty means "no privileged access."
  lens := current_setting('app.active_lens', true);
  IF lens IS NULL OR lens = '' THEN
    RETURN FALSE;
  END IF;

  SELECT trc.capabilities INTO caps
  FROM tenant_roles_catalog trc
  WHERE trc.role = lens;

  IF caps IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN caps ? capability;
END;
$$;

REVOKE ALL ON FUNCTION current_active_role_has_capability(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_active_role_has_capability(TEXT) TO authenticated, service_role;

-- ── Record migration ─────────────────────────────────────────────────────────
INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0008_role_capabilities.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;

COMMIT;
