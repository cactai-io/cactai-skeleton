-- 0010_user_app_settings.sql
-- Per-end-user, app-side settings store.
--
-- v1.3.5 Build 6 introduces the first key: 'embeddings.enabled'.
-- An end user can disable the "remember details" feature here; the platform
-- consults the row at turn start (via embedding-resolver.ts) and treats a
-- value of `false` as a graceful no-op (state 2). Stored knowledge entries
-- are PRESERVED across a toggle-off — re-enabling resumes with prior data
-- intact.
--
-- Default semantics: missing row == enabled. The skeleton's settings UI
-- writes a row only on the first toggle-off, and may delete the row
-- (instead of writing 'true') when the user toggles back on. Either
-- form is acceptable.
--
-- Future keys: any per-end-user, app-level boolean / object toggle that
-- doesn't belong in user_facts / user_preferences (which are AI-extracted)
-- or user_api_keys (which are credentials). Examples we anticipate:
--   'notifications.email_alerts.enabled' — per-user mail opt-out
--   'ui.high_contrast'                   — per-user accessibility
--
-- RLS: a user can read and update their own rows only.

CREATE TABLE IF NOT EXISTS user_app_settings (
  user_id    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS user_app_settings_user_idx
  ON user_app_settings(user_id);

ALTER TABLE user_app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_app_settings_self ON user_app_settings
  FOR ALL
  USING (
    user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
  )
  WITH CHECK (
    user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
  );

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0010_user_app_settings.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
