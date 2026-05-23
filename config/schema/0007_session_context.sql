-- 0007_session_context.sql
-- v1.3 — Session context model: separate active_tenant_id + active_lens claims,
-- one-role-per-tenant constraint, is_default column on tenant_members,
-- FK from tenant_members.role to tenant_roles_catalog, signup_mode value
-- rename.
--
-- This migration supersedes the v1.2 model where a single user could hold
-- multiple roles on the same tenant. Per v1.3 locked decisions, one user has
-- exactly one role per tenant; developer testing of other roles is done via
-- lens impersonation in the avatar menu (platform_role gate).
--
-- Migration order (within this file, atomic in a transaction):
--   1. Drop the hardcoded role CHECK constraint on tenant_members
--   2. Add FK from tenant_members.role -> tenant_roles_catalog.role
--   3. Backfill multi-role rows by keeping highest-rank role per (user, tenant)
--   4. Drop old UNIQUE(user_id, tenant_id, role); add UNIQUE(user_id, tenant_id)
--   5. Add is_default BOOLEAN with partial unique index
--   6. Rename signup_mode values stored in project_state.decisions

BEGIN;

-- ── Step 1: Drop hardcoded role CHECK ────────────────────────────────────────
-- Pre-v1.3 schema had a CHECK constraint hardcoding 'super_admin','admin','user'.
-- v1.3 roles are data-driven via tenant_roles_catalog (added in 0006).
ALTER TABLE tenant_members
  DROP CONSTRAINT IF EXISTS tenant_members_role_check;

-- ── Step 2: FK from tenant_members.role to tenant_roles_catalog.role ────────
-- Ensures any role written to tenant_members exists in the catalog. The
-- catalog is seeded in 0006 with super_admin/admin/user; devs add more via
-- migrations.
ALTER TABLE tenant_members
  ADD CONSTRAINT tenant_members_role_fk
  FOREIGN KEY (role) REFERENCES tenant_roles_catalog(role)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- ── Step 3: Consolidate multi-role rows ──────────────────────────────────────
-- For any (user_id, tenant_id) pair with >1 row, keep the highest-rank role
-- per tenant_roles_catalog.rank. Audit-log the dropped rows so the history
-- is recoverable.
--
-- The developer's pre-v1.3 seed inserts three rows (super_admin/admin/user);
-- post-consolidation the developer holds only super_admin (highest rank).
WITH multi_role_pairs AS (
  SELECT user_id, tenant_id
  FROM tenant_members
  GROUP BY user_id, tenant_id
  HAVING COUNT(*) > 1
),
keep_rows AS (
  SELECT DISTINCT ON (tm.user_id, tm.tenant_id)
    tm.id, tm.user_id, tm.tenant_id, tm.role
  FROM tenant_members tm
  JOIN multi_role_pairs mrp
    ON tm.user_id = mrp.user_id AND tm.tenant_id = mrp.tenant_id
  JOIN tenant_roles_catalog trc ON trc.role = tm.role
  ORDER BY tm.user_id, tm.tenant_id, trc.rank DESC
),
audit_drop AS (
  INSERT INTO audit_log (user_id, tenant_id, lens, action, target_type, target_id, metadata, created_at)
  SELECT tm.user_id, tm.tenant_id, NULL,
         'tenant_member.consolidated', 'tenant_member', tm.id::text,
         jsonb_build_object(
           'migration',    '0007_session_context',
           'kept_role',    kr.role,
           'dropped_role', tm.role,
           'reason',       'one_role_per_tenant_constraint'
         ),
         NOW()
  FROM tenant_members tm
  JOIN keep_rows kr
    ON kr.user_id = tm.user_id AND kr.tenant_id = tm.tenant_id
  WHERE tm.id != kr.id
  RETURNING 1
)
DELETE FROM tenant_members tm
USING keep_rows kr
WHERE tm.user_id = kr.user_id
  AND tm.tenant_id = kr.tenant_id
  AND tm.id != kr.id;

-- ── Step 4: Swap UNIQUE constraint ───────────────────────────────────────────
-- Old: UNIQUE(user_id, tenant_id, role) — permitted multi-role per tenant.
-- New: UNIQUE(user_id, tenant_id)       — enforces one role per tenant.
--
-- The pre-v1.3 constraint name follows Postgres convention:
-- <table>_<col1>_<col2>_..._key. We DROP IF EXISTS so the migration is
-- idempotent across slightly different naming patterns.
ALTER TABLE tenant_members
  DROP CONSTRAINT IF EXISTS tenant_members_user_id_tenant_id_role_key;

ALTER TABLE tenant_members
  ADD CONSTRAINT tenant_members_one_role_per_tenant
  UNIQUE (user_id, tenant_id);

-- ── Step 5: is_default column + partial unique index ─────────────────────────
-- Marks which tenant_members row is the user's default tenant. At most one
-- row per user may have is_default = true (enforced by partial unique index).
--
-- Set at signup or invitation acceptance for the user's first membership.
-- Never auto-set on tenant switch; only via the login modal "Make default"
-- checkbox or an explicit user action in a dev-built settings page.
ALTER TABLE tenant_members
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_one_default_per_user
  ON tenant_members(user_id)
  WHERE is_default = TRUE;

-- ── Step 6: Rename signup_mode values in project_state.decisions ─────────────
-- v1.2.4 mode names map to v1.3 names:
--   multi_user_multi_workspace   -> multi_user_multi_tenant
--   single_user_isolated         -> single_user_multi_tenant
--   multi_user_single_workspace  -> multi_user_single_tenant
--   single_user_shared           -> multi_user_single_tenant   (collapses)
--
-- The collapse from single_user_shared preserves access pattern by setting
-- signup_policy = 'invite_only' on the same row (so existing "shared" tenants
-- don't suddenly grant super_admin to new self-signups).
UPDATE project_state
SET decisions = jsonb_set(
  decisions,
  '{signup_mode_v1_2_4}',
  to_jsonb('multi_user_multi_tenant'::text),
  TRUE
)
WHERE decisions->>'signup_mode_v1_2_4' = 'multi_user_multi_workspace';

UPDATE project_state
SET decisions = jsonb_set(
  decisions,
  '{signup_mode_v1_2_4}',
  to_jsonb('single_user_multi_tenant'::text),
  TRUE
)
WHERE decisions->>'signup_mode_v1_2_4' = 'single_user_isolated';

UPDATE project_state
SET decisions = jsonb_set(
  decisions,
  '{signup_mode_v1_2_4}',
  to_jsonb('multi_user_single_tenant'::text),
  TRUE
)
WHERE decisions->>'signup_mode_v1_2_4' = 'multi_user_single_workspace';

-- Collapse single_user_shared -> multi_user_single_tenant, but preserve access
-- pattern by forcing invite_only signup_policy on those rows.
UPDATE project_state
SET decisions = jsonb_set(
  jsonb_set(
    decisions,
    '{signup_mode_v1_2_4}',
    to_jsonb('multi_user_single_tenant'::text),
    TRUE
  ),
  '{signup_policy_v1_2_4}',
  to_jsonb('invite_only'::text),
  TRUE
)
WHERE decisions->>'signup_mode_v1_2_4' = 'single_user_shared';

-- ── Step 7: Rename signup_mode key to v1_3 to mark migration boundary ───────
-- Apps that read the old key get a graceful fallback; new code reads the new key.
UPDATE project_state
SET decisions = decisions
  - 'signup_mode_v1_2_4'
  || jsonb_build_object('signup_mode_v1_3', decisions->'signup_mode_v1_2_4')
WHERE decisions ? 'signup_mode_v1_2_4';

-- ── Step 8: Record migration ─────────────────────────────────────────────────
INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0007_session_context.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;

COMMIT;
