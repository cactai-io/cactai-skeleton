-- 0011_devshell_kb_events.sql
-- DevShell knowledge-base feedback telemetry.
--
-- Written fire-and-forget by apps/api/src/devshell/knowledge-base-feedback.ts
-- (recordResolution → type='resolution', recordRephrase → type='rephrase'),
-- called from the SprintCycleOrchestrator, via the developer's Supabase pool
-- — the same pool as dev_sprints. The table was referenced by code but
-- defined in no schema (a pre-existing gap surfaced by the v1.3.5 seed-vs-code
-- review); this migration closes it. The insert sites swallow errors (warn +
-- continue), so the only effect of the missing table was silently dropped
-- telemetry — adding it here restores the feedback log.
--
-- Column shape matches both INSERT sites exactly:
--   (type, project_id, developer_id, session_id, payload)
-- Types follow the customer-schema convention (project_id / developer_id /
-- session_id are TEXT, as in dev_sprints and siblings; surrogate UUID PK;
-- jsonb payload).
--
-- RLS: ENABLE with no explicit policy, matching dev_sprints, dev_sprint_goals,
-- and dev_goal_backlog — these dev-tooling tables are accessed via the
-- service-role connection that bypasses RLS; there is no per-end-user row
-- policy for build tooling.
--
-- Idempotent: CREATE ... IF NOT EXISTS throughout; safe for the
-- customer-bootstrap replay path.

BEGIN;

CREATE TABLE IF NOT EXISTS devshell_kb_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL,            -- 'resolution' | 'rephrase'
  project_id    TEXT NOT NULL,
  developer_id  TEXT NOT NULL,
  session_id    TEXT,
  payload       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS devshell_kb_events_project_idx
  ON devshell_kb_events (project_id, created_at);

ALTER TABLE devshell_kb_events ENABLE ROW LEVEL SECURITY;

-- ── Record migration ─────────────────────────────────────────────────────────
INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0011_devshell_kb_events.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;

COMMIT;
