-- 0005_notifications.sql
-- Notifications surfaced in the operator panel's bell. Recipients are app
-- users (devs operating their own app, app super_admins, app admins).
--
-- The notification model is "upsert by condition_key": detection code paths
-- insert/update a row keyed on (recipient_user_id, condition_key); clearance
-- code paths mark resolved_at. Dismissal sets dismissed_at per-row; the bell
-- shows unread = (resolved_at IS NULL AND (dismissed_at IS NULL OR last_seen_at > dismissed_at)).
--
-- See @cactai-io/shell-ui's NotificationBell and apps/api notification
-- emission patterns for usage.

CREATE TABLE IF NOT EXISTS app_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient. NULL means "any user with sufficient role" — the bell-fetch
  -- query handles broadcast notifications based on the active lens.
  recipient_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  required_role     TEXT, -- NULL means any role; otherwise 'super_admin'/'admin'/'user' minimum

  -- Identification + dedup. Same condition_key on the same recipient
  -- upserts rather than inserts. This is how repeated failures of the same
  -- condition stay as one notification with bumped last_seen_at and
  -- occurrence_count.
  condition_key     TEXT NOT NULL,
  severity          TEXT NOT NULL CHECK (severity IN ('info','warning','error','blocking')),

  -- Display
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,

  -- Action affordance. action_kind is one of:
  --   'info_only'  — no action button, just acknowledgment
  --   'retry'      — render a Retry button that POSTs to /api/notifications/:id/retry
  --   'repair'     — render a Repair instructions modal; action_payload.repair_steps is the instructions
  --   'navigate'   — render a link button; action_payload.href is the destination
  action_kind       TEXT NOT NULL DEFAULT 'info_only' CHECK (action_kind IN ('info_only','retry','repair','navigate')),
  action_payload    JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count  INTEGER NOT NULL DEFAULT 1,
  dismissed_at      TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS app_notifications_recipient_condition_idx
  ON app_notifications(COALESCE(recipient_user_id::text, '_broadcast'), condition_key);

CREATE INDEX IF NOT EXISTS app_notifications_recipient_unresolved_idx
  ON app_notifications(recipient_user_id, resolved_at)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS app_notifications_severity_idx
  ON app_notifications(severity, resolved_at)
  WHERE resolved_at IS NULL;

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: a user sees rows where they're the explicit recipient OR where
-- recipient is NULL and required_role <= their active_lens.
CREATE POLICY app_notifications_read ON app_notifications
  FOR SELECT
  USING (
    recipient_user_id = (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
    )
    OR (
      recipient_user_id IS NULL
      AND (
        required_role IS NULL
        OR required_role = current_setting('app.active_lens', true)
        OR (required_role = 'admin'       AND current_setting('app.active_lens', true) IN ('super_admin'))
        OR (required_role = 'user'        AND current_setting('app.active_lens', true) IN ('super_admin','admin'))
      )
    )
  );

-- Policy: a user can update dismissed_at on their own rows (for "I saw it").
-- Insertion + resolution happen via service-role from the skeleton's
-- server-side API routes, not directly from client RLS.
CREATE POLICY app_notifications_dismiss ON app_notifications
  FOR UPDATE
  USING (
    recipient_user_id = (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
    )
  )
  WITH CHECK (
    recipient_user_id = (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
    )
  );

-- Migration registry entry (the runner also tracks this; this INSERT is
-- defensive for the fresh-install case where bootstrap iterates files in
-- order).
INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0005_notifications.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
