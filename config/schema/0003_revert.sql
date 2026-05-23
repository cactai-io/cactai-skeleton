-- config/schema/0003_revert.sql
-- Thread 12 of the v1.2 commit-flow rebuild — revert support.
--
-- Adds the `reverts_sha` column to commit_log so the history view can
-- mark revert commits with a "Revert of <sha>" pill and so future
-- queries (e.g. "show me every revert") can filter by it directly.
--
-- The column is nullable: only commits created by the revert flow get
-- a non-null value. Normal commits leave it null.
--
-- Index: commits filtering by `reverts_sha = <original>` is the only
-- access pattern we need (the modal asks "was this commit reverted?"
-- via WHERE reverts_sha = <original_sha>). A partial index on the
-- non-null subset keeps it tiny.
--
-- Idempotent: the column add and the index are both gated with
-- IF NOT EXISTS so re-running the migration is safe (matches the
-- v1.2 0002 migration's pattern).
--
-- The /api/github/commit route writes this field when the request
-- body includes `reverts_sha`. The /api/history/commits route surfaces
-- it on every row. CommitHistoryModal renders the pill when present.

ALTER TABLE commit_log
  ADD COLUMN IF NOT EXISTS reverts_sha TEXT;

-- Partial index — only the small subset of revert commits is indexed.
CREATE INDEX IF NOT EXISTS commit_log_reverts_sha_idx
  ON commit_log (reverts_sha)
  WHERE reverts_sha IS NOT NULL;

-- Optional foreign-key constraint: a revert commit references the
-- original commit it reverses. We use ON DELETE SET NULL so deleting
-- an original (rare; usually only during testing or cleanup) leaves
-- the revert intact rather than cascading away.
--
-- The constraint is added in a DO block so re-running the migration
-- doesn't trip a "constraint already exists" error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commit_log_reverts_sha_fkey'
  ) THEN
    ALTER TABLE commit_log
      ADD CONSTRAINT commit_log_reverts_sha_fkey
      FOREIGN KEY (reverts_sha)
      REFERENCES commit_log(commit_sha)
      ON DELETE SET NULL;
  END IF;
END $$;
