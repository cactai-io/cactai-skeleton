// src/lib/pendingFiles.ts
// Shared validation and shaping for the v1.2 pending-files routes.
//
// The route layer uses these helpers so /api/pending/files,
// /api/pending/flush, and /api/github/commit all agree on:
//   - what a valid PendingOperation value is
//   - what a valid repo-relative path looks like
//   - the canonical row shape going into Supabase

// Five operation types — must match the @cactai-io/types PendingOperation
// union and the CHECK constraint on the pending_files table.
export const PENDING_OPERATIONS = ['edit', 'create', 'delete', 'rename', 'move'] as const;
export type PendingOperation = typeof PENDING_OPERATIONS[number];

export function isPendingOperation(v: unknown): v is PendingOperation {
  return typeof v === 'string' && (PENDING_OPERATIONS as readonly string[]).includes(v);
}

// Path validation. Paths must:
//   - be non-empty strings
//   - have no leading slash (relative-to-repo-root)
//   - have no `..` segments (no traversal)
//   - have no NUL bytes
//   - stay under a generous length cap so the PK fits in Postgres without
//     surprises (200 chars covers every reasonable source path).
export function isValidRepoPath(p: unknown): p is string {
  if (typeof p !== 'string') return false;
  if (p.length === 0 || p.length > 200) return false;
  if (p.startsWith('/')) return false;
  if (p.includes('\0')) return false;
  const segments = p.split('/');
  for (const seg of segments) {
    if (seg === '' || seg === '.' || seg === '..') return false;
  }
  return true;
}

// Canonical row shape persisted to pending_files. The route fills
// user_id from the authenticated session; clients never send it.
export interface PendingFileRow {
  user_id:          string;
  path:             string;
  operation:        PendingOperation;
  new_path:         string | null;
  original_content: string | null;
  current_content:  string | null;
  last_edited_at:   string;
  lines_added:      number;
  lines_removed:    number;
}

// Validate a single incoming file payload. Returns the canonical row on
// success or a list of errors on failure.
export function validatePendingFileInput(
  raw: unknown,
  userId: string,
): { ok: true; row: PendingFileRow } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['file payload must be an object'] };
  }
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];

  if (!isValidRepoPath(r.path)) {
    errors.push('path is missing or not a valid repo path');
  }
  if (!isPendingOperation(r.operation)) {
    errors.push(`operation must be one of ${PENDING_OPERATIONS.join(', ')}`);
  }
  const newPathProvided = r.new_path !== undefined && r.new_path !== null;
  if (newPathProvided && !isValidRepoPath(r.new_path)) {
    errors.push('new_path is not a valid repo path');
  }
  if (r.operation === 'rename' || r.operation === 'move') {
    if (!newPathProvided) errors.push(`new_path is required for operation '${r.operation as string}'`);
  } else if (newPathProvided) {
    errors.push('new_path may only be set for rename or move operations');
  }
  if (r.original_content !== null && typeof r.original_content !== 'string') {
    errors.push('original_content must be string or null');
  }
  if (r.current_content !== null && typeof r.current_content !== 'string') {
    errors.push('current_content must be string or null');
  }
  if (r.operation === 'delete' && r.current_content !== null) {
    errors.push("operation 'delete' requires current_content === null");
  }
  if (r.operation === 'create' && r.original_content !== null) {
    errors.push("operation 'create' requires original_content === null");
  }
  if (typeof r.last_edited_at !== 'string' || !isISO8601(r.last_edited_at)) {
    errors.push('last_edited_at must be an ISO-8601 timestamp string');
  }
  if (typeof r.lines_added !== 'number' || r.lines_added < 0 || !Number.isFinite(r.lines_added)) {
    errors.push('lines_added must be a non-negative finite number');
  }
  if (typeof r.lines_removed !== 'number' || r.lines_removed < 0 || !Number.isFinite(r.lines_removed)) {
    errors.push('lines_removed must be a non-negative finite number');
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    row: {
      user_id:          userId,
      path:             r.path as string,
      operation:        r.operation as PendingOperation,
      new_path:         newPathProvided ? (r.new_path as string) : null,
      original_content: (r.original_content as string | null),
      current_content:  (r.current_content as string | null),
      last_edited_at:   r.last_edited_at as string,
      lines_added:      Math.floor(r.lines_added as number),
      lines_removed:    Math.floor(r.lines_removed as number),
    },
  };
}

// Cheap ISO-8601 validator: parse via Date, accept anything that yields
// a finite time value. Strict format isn't required because the database
// column is TIMESTAMPTZ — Postgres normalizes on insert.
function isISO8601(s: string): boolean {
  if (s.length < 10) return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}
