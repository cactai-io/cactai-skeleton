-- 0004_migrations.sql
-- Migration registry. Tracks which schema files have been applied to this
-- customer database. The migration runner (apps/api/src/migration-runner.ts)
-- reads this table to determine which files in apps/api/schema/customer/
-- still need to run.
--
-- Seeding semantics:
--   On a fresh customer Supabase, this file is one of the SCHEMA_FILES
--   iterated by customer-bootstrap.ts in filename order. By the time this
--   file runs, 0001/0002/0003 have already been applied (bootstrap runs them
--   in order). The seed INSERT below records 0001-0003 as applied so the
--   runner doesn't try to re-apply them on subsequent boots.
--
-- Going forward:
--   Any new schema file (0005_*, 0006_*, ...) must be added to SCHEMA_FILES
--   in customer-bootstrap.ts (for fresh installs) AND will be picked up by
--   the migration runner on existing installs.

CREATE TABLE IF NOT EXISTS migrations (
  filename     TEXT PRIMARY KEY,
  checksum     TEXT NOT NULL,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: mark 0001, 0002, 0003, and this file (0004) as applied. Checksums
-- are intentionally placeholders ('seeded') — the runner only validates
-- checksums for files it applied itself, not for seeded entries. This means
-- an existing install with a hand-edited 0001 won't be flagged retroactively.
INSERT INTO migrations (filename, checksum, applied_at) VALUES
  ('0001_initial.sql',      'seeded', NOW()),
  ('0002_pending_edits.sql','seeded', NOW()),
  ('0003_revert.sql',       'seeded', NOW()),
  ('0004_migrations.sql',   'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
