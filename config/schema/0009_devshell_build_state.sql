-- 0009_devshell_build_state.sql
-- v1.3 DevShell build state machine — adds the columns the orchestrator
-- reads + writes on every turn during purpose capture, the five stages,
-- build approval, building, and sprint cycle.
--
-- Reference:
--   - devshell-build-manifest-schema.md (manifest shape + lifecycle)
--   - devshell-orchestrator-architecture.md (build_phase state machine)
--   - devshell-stages-consolidated.md (StageStep enumeration)
--
-- This migration:
--   1. Drops the now-stale CHECK constraint on workflow_step (the legacy
--      11-step enum is being replaced by build_phase + current_step).
--   2. Makes workflow_step nullable so new rows don't need the legacy value.
--   3. Adds build_phase, current_step, build_manifest, manifest_history,
--      migration_history, sprint_cycle.
--
-- Idempotent: each ALTER is guarded by IF NOT EXISTS / IF EXISTS so re-runs
-- on already-migrated DBs are no-ops. Safe for the customer-bootstrap
-- replay path.

BEGIN;

-- 1. Drop the legacy workflow_step CHECK. Old enum values
--    (name_and_intent, audience, ...) are no longer in use, and brand_lock
--    was a TypeScript-only addition that was never in the CHECK list anyway
--    (pre-existing schema drift, now resolved by removal).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
     WHERE table_name = 'project_state'
       AND column_name = 'workflow_step'
       AND constraint_name LIKE '%workflow_step%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE project_state DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name)
        FROM information_schema.constraint_column_usage
       WHERE table_name = 'project_state'
         AND column_name = 'workflow_step'
         AND constraint_name LIKE '%workflow_step%'
       LIMIT 1
    );
  END IF;
END $$;

-- 2. Make workflow_step nullable. New v1.3 rows write build_phase /
--    current_step instead; the legacy column is retained for back-compat
--    with rows written under the old model.
ALTER TABLE project_state ALTER COLUMN workflow_step DROP NOT NULL;

-- 3. Add the new v1.3 build state columns.
--
--    build_phase     — BuildPhase enum (string at the SQL layer). Null for
--                      pre-v1.3 rows; the orchestrator initialises to
--                      'purpose_capture' on first open.
--    current_step    — StageStep enum or null. Null during purpose_capture,
--                      build_approval, building, sprint_cycle. Non-null
--                      during the five stage_N_* phases.
--    build_manifest  — full BuildManifest JSONB. Null until purpose capture
--                      runs the inference call. See @cactai-io/types for the
--                      typed shape.
--    manifest_history — append-only audit log of manifest field changes;
--                      array of ManifestHistoryEntry. Powers the decision
--                      log revisit feature.
--    migration_history — append-only log of manifest schema migrations
--                      applied to this project; array of MigrationHistoryEntry.
--    sprint_cycle    — free-form JSONB the sprint cycle phase uses for its
--                      state. Schema defined in Phase 15.
ALTER TABLE project_state ADD COLUMN IF NOT EXISTS build_phase       TEXT;
ALTER TABLE project_state ADD COLUMN IF NOT EXISTS current_step      TEXT;
ALTER TABLE project_state ADD COLUMN IF NOT EXISTS build_manifest    JSONB;
ALTER TABLE project_state ADD COLUMN IF NOT EXISTS manifest_history  JSONB NOT NULL DEFAULT '[]';
ALTER TABLE project_state ADD COLUMN IF NOT EXISTS migration_history JSONB NOT NULL DEFAULT '[]';
ALTER TABLE project_state ADD COLUMN IF NOT EXISTS sprint_cycle      JSONB;

-- Index supporting the orchestrator's "find sessions in a given phase" path
-- (used by the upcoming Phase 8 deployment-events fan-out to wake DevShells
-- in build_approval or sprint_cycle when their preview deploys).
CREATE INDEX IF NOT EXISTS project_state_build_phase_idx
  ON project_state (build_phase)
  WHERE build_phase IS NOT NULL;

-- ── Record migration ─────────────────────────────────────────────────────────
INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0009_devshell_build_state.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;

COMMIT;
