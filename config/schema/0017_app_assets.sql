-- 0017_app_assets.sql
-- Developer-uploaded app assets for the Library (pass 2). Files the developer
-- brings into the app — brand images, reference docs, seed data, etc. The
-- Library indexes these alongside authored tools/skills + generated artifacts.
--
-- Pass-2 stores the bytes directly in the customer DB (bytea) with a size cap
-- enforced at the API layer — simplest correct implementation, fine for the
-- small assets this is for. Large-file offload to Supabase Storage is a later
-- optimization that keeps this metadata table as the index.

CREATE TABLE IF NOT EXISTS app_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      text NOT NULL,
  content_type  text,
  size_bytes    bigint,
  data          bytea NOT NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_assets_uploaded_idx ON app_assets(uploaded_at DESC);

ALTER TABLE app_assets ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read asset metadata + content (assets are app
-- content the app itself serves). Uploads/deletes go through the platform's
-- service-role connection from DevShell, never directly from end users.
DROP POLICY IF EXISTS app_assets_read ON app_assets;
CREATE POLICY app_assets_read ON app_assets
  FOR SELECT TO authenticated USING (TRUE);

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0017_app_assets.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
