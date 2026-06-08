-- 0019_sharing.sql
-- Sharing module — share app content out via a tokenised link to a read-only
-- (or copyable / interactive) view. Self-contained + flag-gated + REMOVABLE:
-- the whole module (this table, src/lib/sharing.server.ts, the /api/sharing
-- route, and the /share/[token] viewer) is declared in the feature registry
-- (src/lib/features.ts, key 'sharing') and deleted together on Remove.
--
-- Owners create + manage their own links (RLS). The PUBLIC viewer resolves a
-- link by token through the service-role connection (the link token itself is
-- the credential), so anonymous visitors can open a share without an account.

CREATE TABLE IF NOT EXISTS shared_links (
  token         TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  mode          TEXT NOT NULL DEFAULT 'read_only'
                  CHECK (mode IN ('read_only', 'copy', 'interactive')),
  created_by    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shared_links_owner_idx ON shared_links(created_by);

ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- Owners read/write only their own links. Public token resolution bypasses
-- RLS via the service-role connection (see resolveShareLink).
DROP POLICY IF EXISTS shared_links_owner ON shared_links;
CREATE POLICY shared_links_owner ON shared_links
  FOR ALL
  USING (
    created_by = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
  )
  WITH CHECK (
    created_by = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid)
  );

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0019_sharing.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
