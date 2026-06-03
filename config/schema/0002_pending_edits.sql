-- config/schema/0002_pending_edits.sql
-- v1.2 commit-flow rebuild — pending edits, commit log, commit log files.
--
-- These tables live in the developer's own Supabase. They support the
-- DevShell's pending-edits → atomic commit-to-dev → history flow:
--
--   pending_files       — rows for files with uncommitted local edits.
--                         One row per (user, path). Operation is one of
--                         'edit', 'create', 'delete', 'rename', 'move'.
--                         current_content is null for delete operations.
--                         original_content is null for newly created files.
--                         new_path is set only for rename / move.
--
--   commit_log          — header for each commit made through the DevShell.
--                         Only DevShell-originated commits are recorded
--                         here. Commits made via git CLI or the GitHub web
--                         UI do not appear in this table.
--
--   commit_log_files    — files in each commit, with operation type, line
--                         counts, and content snapshots. The snapshots
--                         let CommitHistoryModal render the expandable
--                         diff inline without re-fetching from GitHub.
--                         One row per (commit_sha, path).
--
-- Auth model: row-level security keyed on auth.uid().
--   pending_files     — owner reads and writes their own rows.
--   commit_log        — any platform-role user reads; the commit route
--                       writes via the user session (RLS allows writes
--                       only from the committer themselves).
--   commit_log_files  — any platform-role user reads; writes follow the
--                       same model as commit_log.
--
-- The /api/github/commit route inserts to commit_log + commit_log_files
-- after a successful GitHub commit succeeds. A failed Supabase insert
-- after a successful GitHub commit is logged but does not roll back the
-- commit — GitHub is the source of truth and the Supabase rows are a
-- convenience for the history modal.

-- ── pending_files ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pending_files (
  user_id          UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  path             TEXT        NOT NULL,
  operation        TEXT        NOT NULL CHECK (operation IN ('edit', 'create', 'delete', 'rename', 'move')),
  new_path         TEXT,
  original_content TEXT,
  current_content  TEXT,
  last_edited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lines_added      INTEGER     NOT NULL DEFAULT 0 CHECK (lines_added >= 0),
  lines_removed    INTEGER     NOT NULL DEFAULT 0 CHECK (lines_removed >= 0),
  -- Operation-specific shape constraints. These mirror the validation in
  -- /lib/pendingFiles.ts so the database is the last line of defense.
  CHECK (
    (operation IN ('rename', 'move') AND new_path IS NOT NULL)
    OR
    (operation NOT IN ('rename', 'move') AND new_path IS NULL)
  ),
  CHECK (
    (operation = 'delete' AND current_content IS NULL)
    OR
    (operation <> 'delete')
  ),
  CHECK (
    (operation = 'create' AND original_content IS NULL)
    OR
    (operation <> 'create')
  ),
  PRIMARY KEY (user_id, path)
);

CREATE INDEX IF NOT EXISTS pending_files_user_edited_idx
  ON pending_files (user_id, last_edited_at DESC);

ALTER TABLE pending_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_files_self_read ON pending_files;
CREATE POLICY pending_files_self_read ON pending_files FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS pending_files_self_insert ON pending_files;
CREATE POLICY pending_files_self_insert ON pending_files FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS pending_files_self_update ON pending_files;
CREATE POLICY pending_files_self_update ON pending_files FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS pending_files_self_delete ON pending_files;
CREATE POLICY pending_files_self_delete ON pending_files FOR DELETE
  USING (user_id = auth.uid());

-- ── commit_log ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commit_log (
  commit_sha   TEXT        PRIMARY KEY,
  committer_id UUID        NOT NULL REFERENCES app_users(id) ON DELETE SET NULL,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message      TEXT        NOT NULL
);

CREATE INDEX IF NOT EXISTS commit_log_committed_at_idx
  ON commit_log (committed_at DESC);

ALTER TABLE commit_log ENABLE ROW LEVEL SECURITY;

-- Any authenticated platform-role user can read the commit history.
DROP POLICY IF EXISTS commit_log_platform_read ON commit_log;
CREATE POLICY commit_log_platform_read ON commit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles pr
      WHERE pr.user_id = auth.uid()
    )
  );

-- Writes come from /api/github/commit immediately after a successful
-- GitHub commit. The route runs with the user's session, so RLS allows
-- inserts when the committer matches the session user.
DROP POLICY IF EXISTS commit_log_self_insert ON commit_log;
CREATE POLICY commit_log_self_insert ON commit_log FOR INSERT
  WITH CHECK (committer_id = auth.uid());

-- ── commit_log_files ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commit_log_files (
  commit_sha       TEXT        NOT NULL REFERENCES commit_log(commit_sha) ON DELETE CASCADE,
  path             TEXT        NOT NULL,
  operation        TEXT        NOT NULL CHECK (operation IN ('edit', 'create', 'delete', 'rename', 'move')),
  new_path         TEXT,
  last_edited_at   TIMESTAMPTZ NOT NULL,
  lines_added      INTEGER     NOT NULL DEFAULT 0 CHECK (lines_added >= 0),
  lines_removed    INTEGER     NOT NULL DEFAULT 0 CHECK (lines_removed >= 0),
  -- Content snapshots. These let CommitHistoryModal render the inline
  -- diff for a historic commit without re-fetching from GitHub. Both
  -- are nullable so deletes (current_content NULL) and creates
  -- (original_content NULL) carry the same shape as their pending_files
  -- counterparts.
  original_content TEXT,
  current_content  TEXT,
  PRIMARY KEY (commit_sha, path)
);

ALTER TABLE commit_log_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commit_log_files_platform_read ON commit_log_files;
CREATE POLICY commit_log_files_platform_read ON commit_log_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles pr
      WHERE pr.user_id = auth.uid()
    )
  );

-- Writes follow commit_log: the same route inserts both tables after
-- a successful GitHub commit. RLS allows inserts when the parent commit
-- exists and was inserted by this session.
DROP POLICY IF EXISTS commit_log_files_committer_insert ON commit_log_files;
CREATE POLICY commit_log_files_committer_insert ON commit_log_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM commit_log cl
      WHERE cl.commit_sha = commit_log_files.commit_sha
        AND cl.committer_id = auth.uid()
    )
  );
