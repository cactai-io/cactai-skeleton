// src/app/api/github/commit/route.ts
// Commit-to-dev — the single GitHub commit endpoint.
//
// Two body shapes are supported:
//
// 1. Legacy config-patches shape (pre-v1.2):
//        { patches: { 'theme.tokens.color_primary': '#fff', ... },
//          branch:  'dev',
//          message: '...' }
//    A flat map of dot-paths to values. The route reads the current
//    skeleton.config.json from the branch, applies the patches via setDeep
//    (numeric segments become array indices), and writes the file back
//    as one commit via the GitHub Contents API. This path is what the
//    /lib/tokens.ts flow uses.
//
// 2. v1.2 multi-file shape:
//        { files: [
//            { path, operation, new_path?, content?, last_edited_at,
//              lines_added, lines_removed },
//            ...
//          ],
//          message: '...',
//          // Thread 12: optional; set by the revert flow to record the
//          // original commit in commit_log.reverts_sha. Null on normal
//          // commits.
//          reverts_sha?: string | null }
//    Each file carries one of the five pending operations
//    (edit / create / delete / rename / move). The route resolves each
//    file's content from the request (if `content` is present) or from
//    the developer's pending_files row, then builds a single atomic git
//    commit via the trees + commits APIs that applies every operation
//    in one commit. After the GitHub commit succeeds, the route writes
//    to commit_log + commit_log_files so /api/history/commits can show
//    it.
//
// Branch is always `dev`. The legacy `branch` parameter on the patches
// shape is ignored if it isn't `dev` — the v1.2 rebuild removed the
// commit-to-main path entirely.
//
// Thread 11 — conflict detection. Before building the new tree we do a
// pre-flight pass: for each file in the request we fetch the current
// content on dev. The check is "did the snapshot the developer's edit
// was based on still match dev?" — for edit/delete, we compare
// `original_content` against the remote content; for create, we ensure
// the path is empty on dev; for rename/move we check both the source
// (must still match original) and the destination (must still be
// empty). When any file diverges the route returns 409 with a
// structured `conflict` payload listing each file's local + remote
// content snapshots so the client's CommitConflictModal can present
// the three resolution choices. The client retries via this same route
// after resolving — its body's `files[].content` fields now carry the
// resolved content, and the request includes a `resolved: true` flag
// the route uses to skip the pre-flight pass (the developer has
// already made the call).
//
// Dev-only simulation: when NODE_ENV !== 'production' and the request
// query string contains `?simulateCommitConflict=1`, the route fabricates
// a conflict response without touching GitHub. This is the test fixture
// Thread 11's verification calls for; production rejects the param.
//
// Protected: dev/collaborator only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import {
  isPendingOperation,
  isValidRepoPath,
  type PendingOperation,
} from '@/lib/pendingFiles';

const GITHUB_API  = 'https://api.github.com';
const CONFIG_PATH = 'skeleton.config.json';
const BRANCH      = 'dev';

interface LegacyPatchesBody {
  patches: Record<string, unknown>;
  branch?: string;
  message: string;
}

interface MultiFileInput {
  path:           string;
  operation:      PendingOperation;
  new_path?:      string | null;
  content?:       string | null;
  last_edited_at: string;
  lines_added:    number;
  lines_removed:  number;
}

interface MultiFileBody {
  files:    MultiFileInput[];
  message:  string;
  /** Thread 11 — set to true after the developer resolves a conflict
   *  via CommitConflictModal. Skips the pre-flight conflict pass since
   *  the request already encodes the resolved content for every file. */
  resolved?:    boolean;
  /** Thread 12 — populated by the revert flow. Stored as
   *  commit_log.reverts_sha so the history view can render the
   *  "Revert of <sha>" pill. Null/omitted on normal commits. */
  reverts_sha?: string | null;
}

function isMultiFileBody(b: unknown): b is MultiFileBody {
  return !!b && typeof b === 'object' && Array.isArray((b as { files?: unknown }).files);
}

function isLegacyBody(b: unknown): b is LegacyPatchesBody {
  return !!b && typeof b === 'object' && (b as { patches?: unknown }).patches !== undefined;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireDevRole();
    const body = await req.json().catch(() => ({}));

    // Thread 11 — dev-only conflict simulation. Honored only when the
    // build is not production. Returns a fabricated conflict response
    // that exercises the entire client-side modal flow without touching
    // GitHub.
    if (
      process.env.NODE_ENV !== 'production' &&
      req.nextUrl.searchParams.get('simulateCommitConflict') === '1' &&
      isMultiFileBody(body)
    ) {
      return simulateCommitConflict(body);
    }

    if (isMultiFileBody(body)) {
      return handleMultiFileCommit(body, user.id, req);
    }
    if (isLegacyBody(body)) {
      return handleLegacyPatches(body);
    }
    return NextResponse.json({ error: 'invalid_body', detail: 'expected { patches } or { files }' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'commit_failed' }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Legacy patches path — preserved verbatim from the pre-v1.2 route.
// ────────────────────────────────────────────────────────────────────────────

async function handleLegacyPatches(body: LegacyPatchesBody): Promise<NextResponse> {
  const { patches, message } = body;
  const token    = process.env.GITHUB_TOKEN;
  const repoName = process.env.GITHUB_REPO_NAME;

  if (!token || !repoName) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }
  if (!patches || typeof patches !== 'object') {
    return NextResponse.json({ error: 'invalid_buffer' }, { status: 400 });
  }

  const headers = {
    Authorization:          `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    Accept:                 'application/vnd.github+json',
    'Content-Type':         'application/json',
  };

  // Read current config from the dev branch, or start from an empty
  // object if skeleton.config.json does not yet exist (first commit from a
  // fresh fork).
  let currentConfig: Record<string, unknown> = {};
  let existingSha: string | undefined;

  const readRes = await fetch(
    `${GITHUB_API}/repos/${repoName}/contents/${CONFIG_PATH}?ref=${BRANCH}`,
    { headers },
  );
  if (readRes.ok) {
    const readData = (await readRes.json()) as { content: string; sha: string };
    try {
      currentConfig = JSON.parse(Buffer.from(readData.content, 'base64').toString('utf-8'));
    } catch {
      currentConfig = {};
    }
    existingSha = readData.sha;
  } else if (readRes.status !== 404) {
    return NextResponse.json({ error: 'read_config_failed', status: readRes.status }, { status: 502 });
  }

  for (const [path, value] of Object.entries(patches)) {
    setDeep(currentConfig, path, value);
  }

  const updated = JSON.stringify(currentConfig, null, 2) + '\n';
  const encoded = Buffer.from(updated).toString('base64');

  const writeBody: Record<string, unknown> = { message, content: encoded, branch: BRANCH };
  if (existingSha) writeBody.sha = existingSha;

  const writeRes = await fetch(`${GITHUB_API}/repos/${repoName}/contents/${CONFIG_PATH}`, {
    method:  'PUT',
    headers,
    body:    JSON.stringify(writeBody),
  });
  if (!writeRes.ok) {
    const err = await writeRes.json();
    return NextResponse.json({ error: 'write_config_failed', detail: err }, { status: 502 });
  }

  return NextResponse.json({ committed: [CONFIG_PATH], patches: Object.keys(patches) });
}

// ────────────────────────────────────────────────────────────────────────────
// Multi-file path — v1.2 atomic commit-to-dev across all operation types.
// ────────────────────────────────────────────────────────────────────────────

async function handleMultiFileCommit(body: MultiFileBody, userId: string, req: NextRequest): Promise<NextResponse> {
  const token    = process.env.GITHUB_TOKEN;
  const repoName = process.env.GITHUB_REPO_NAME;
  if (!token || !repoName) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }
  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
  }
  if (!Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: 'no_files' }, { status: 400 });
  }
  if (body.files.length > 200) {
    return NextResponse.json({ error: 'too_many_files' }, { status: 413 });
  }
  // Optional reverts_sha — accept only well-formed SHAs and route into
  // the commit_log insert later in the function.
  let revertsSha: string | null = null;
  if (body.reverts_sha !== undefined && body.reverts_sha !== null) {
    if (typeof body.reverts_sha !== 'string' || !/^[0-9a-f]{7,64}$/i.test(body.reverts_sha)) {
      return NextResponse.json({ error: 'invalid_reverts_sha' }, { status: 400 });
    }
    revertsSha = body.reverts_sha;
  }
  // Hint for the conflict pass below.
  const isResolvedRetry = body.resolved === true;
  void req; // reserved for future request-scoped behavior

  // Validate each file shape.
  const validation = validateMultiFileInputs(body.files);
  if (!validation.ok) {
    return NextResponse.json({ error: 'validation_failed', detail: validation.errors }, { status: 400 });
  }
  const files = validation.files;

  // Resolve content for each file from pending_files when the client
  // didn't include it inline. We bulk-fetch all needed paths in one query.
  const supabase = await createServerSupabaseClient();
  const pathsNeedingContent = files
    .filter(f => (f.operation === 'edit' || f.operation === 'create' || f.operation === 'rename' || f.operation === 'move') && f.content === undefined)
    .map(f => f.path);

  const pendingByPath = new Map<string, { current_content: string | null; original_content: string | null }>();
  if (pathsNeedingContent.length > 0) {
    const { data, error } = await supabase
      .from('pending_files')
      .select('path, current_content, original_content')
      .eq('user_id', userId)
      .in('path', pathsNeedingContent);
    if (error) {
      return NextResponse.json({ error: 'pending_lookup_failed', detail: error.message }, { status: 500 });
    }
    for (const r of (data ?? []) as Array<{ path: string; current_content: string | null; original_content: string | null }>) {
      pendingByPath.set(r.path, { current_content: r.current_content, original_content: r.original_content });
    }
  }

  // Resolve content per file. Returns the final string the blob will hold,
  // or null when the operation is 'delete'.
  const resolved: Array<{
    input:   typeof files[number];
    content: string | null;
    // original_content is needed for the commit_log_files snapshot.
    original_content: string | null;
  }> = [];
  for (const f of files) {
    if (f.operation === 'delete') {
      // Delete needs original_content for the history snapshot but no
      // current_content for the tree write.
      const fromPending = pendingByPath.get(f.path);
      resolved.push({ input: f, content: null, original_content: fromPending?.original_content ?? null });
      continue;
    }
    let content: string | null | undefined = f.content;
    let original_content: string | null = null;
    if (content === undefined) {
      const fromPending = pendingByPath.get(f.path);
      if (!fromPending) {
        return NextResponse.json({
          error: 'missing_content',
          detail: `no content for '${f.path}' (operation '${f.operation}') in request body or pending_files`,
        }, { status: 400 });
      }
      content = fromPending.current_content;
      original_content = fromPending.original_content;
    }
    if (content === null) {
      // current_content shouldn't be null for non-delete ops — that means
      // the client forgot to provide content or the staging row is malformed.
      return NextResponse.json({
        error: 'missing_content',
        detail: `null content for '${f.path}' (operation '${f.operation}')`,
      }, { status: 400 });
    }
    resolved.push({ input: f, content, original_content });
  }

  const headers = {
    Authorization:          `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    Accept:                 'application/vnd.github+json',
    'Content-Type':         'application/json',
  };

  // 1. Get the current dev branch ref → parent commit SHA.
  const refRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/refs/heads/${BRANCH}`, { headers });
  if (!refRes.ok) {
    return NextResponse.json({ error: 'ref_fetch_failed', status: refRes.status }, { status: 502 });
  }
  const refData = await refRes.json() as { object: { sha: string } };
  const parentCommitSha = refData.object.sha;

  // 1a. Thread 11 — pre-flight conflict pass. For every touched path we
  //     fetch dev's current content and compare against the request's
  //     `original_content` snapshot. Divergence on any file produces a
  //     409 with a structured conflict payload so the client's
  //     CommitConflictModal can render the resolution UI. Resolved
  //     retries (`body.resolved === true`) skip this — the developer
  //     has already picked sides.
  if (!isResolvedRetry) {
    const conflict = await detectConflicts({
      repoName, headers, resolved, parentCommitSha,
    });
    if (conflict.length > 0) {
      return NextResponse.json({
        error:    'conflict',
        message:  'dev has changed since your local copy',
        files:    conflict,
      }, { status: 409 });
    }
  }

  // 2. Get the parent commit's tree SHA.
  const parentRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/commits/${parentCommitSha}`, { headers });
  if (!parentRes.ok) {
    return NextResponse.json({ error: 'parent_fetch_failed', status: parentRes.status }, { status: 502 });
  }
  const parentData = await parentRes.json() as { tree: { sha: string } };
  const parentTreeSha = parentData.tree.sha;

  // 3. Create blobs for every file that gets content. Done sequentially
  // to keep error handling simple; the volume should be small enough
  // (typically tens of files) that parallelism isn't worth the complexity.
  const blobShaByPath = new Map<string, string>();
  for (const r of resolved) {
    if (r.content === null) continue; // delete — no blob needed
    // The target path depends on operation: rename/move write to new_path;
    // edit/create write to path. Multiple operations sharing a blob is rare
    // (each path is unique within a commit) so we key the blob by the
    // destination path.
    const destPath = (r.input.operation === 'rename' || r.input.operation === 'move')
      ? (r.input.new_path as string)
      : r.input.path;
    const encoded = Buffer.from(r.content, 'utf-8').toString('base64');
    const blobRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/blobs`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ content: encoded, encoding: 'base64' }),
    });
    if (!blobRes.ok) {
      return NextResponse.json({ error: 'blob_create_failed', path: destPath, status: blobRes.status }, { status: 502 });
    }
    const blob = await blobRes.json() as { sha: string };
    blobShaByPath.set(destPath, blob.sha);
  }

  // 4. Compose the new tree. Each entry either:
  //   - sets sha to a new blob SHA (write) or
  //   - sets sha to null (deletion)
  interface TreeEntry { path: string; mode: '100644'; type: 'blob'; sha: string | null }
  const treeEntries: TreeEntry[] = [];
  for (const r of resolved) {
    switch (r.input.operation) {
      case 'edit':
      case 'create': {
        const sha = blobShaByPath.get(r.input.path);
        if (!sha) continue; // unreachable given step 3 succeeded
        treeEntries.push({ path: r.input.path, mode: '100644', type: 'blob', sha });
        break;
      }
      case 'delete': {
        treeEntries.push({ path: r.input.path, mode: '100644', type: 'blob', sha: null });
        break;
      }
      case 'rename':
      case 'move': {
        // Two entries: remove old path, write new path's blob.
        treeEntries.push({ path: r.input.path, mode: '100644', type: 'blob', sha: null });
        const newPath = r.input.new_path as string;
        const sha = blobShaByPath.get(newPath);
        if (!sha) continue;
        treeEntries.push({ path: newPath, mode: '100644', type: 'blob', sha });
        break;
      }
    }
  }

  // 5. Create the new tree (base_tree = parent tree so we inherit all
  // un-touched entries).
  const treeRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/trees`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ base_tree: parentTreeSha, tree: treeEntries }),
  });
  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({}));
    return NextResponse.json({ error: 'tree_create_failed', detail: err, status: treeRes.status }, { status: 502 });
  }
  const newTree = await treeRes.json() as { sha: string };

  // 6. Create the commit pointing at the new tree.
  const commitRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/commits`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({
      message: body.message,
      tree:    newTree.sha,
      parents: [parentCommitSha],
    }),
  });
  if (!commitRes.ok) {
    const err = await commitRes.json().catch(() => ({}));
    return NextResponse.json({ error: 'commit_create_failed', detail: err, status: commitRes.status }, { status: 502 });
  }
  const newCommit = await commitRes.json() as { sha: string };

  // 7. Fast-forward the dev branch ref to point at the new commit.
  const updateRefRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/refs/heads/${BRANCH}`, {
    method:  'PATCH',
    headers,
    body:    JSON.stringify({ sha: newCommit.sha, force: false }),
  });
  if (!updateRefRes.ok) {
    const err = await updateRefRes.json().catch(() => ({}));
    return NextResponse.json({ error: 'ref_update_failed', detail: err, status: updateRefRes.status }, { status: 502 });
  }

  // 8. Record the commit in Supabase. commit_log first (parent), then
  // commit_log_files (children) — both atomic from the client's perspective.
  // We use the user-session client; RLS allows platform-role users to
  // read these tables, but writes are gated by the service-role key in
  // production. For the v1.2 migration the table is open enough to allow
  // the session-scoped insert; if RLS tightens later, swap to
  // createServiceSupabaseClient here.
  {
    const { error: insertCommitErr } = await supabase
      .from('commit_log')
      .insert({
        commit_sha:   newCommit.sha,
        committer_id: userId,
        committed_at: new Date().toISOString(),
        message:      body.message,
        reverts_sha:  revertsSha,
      });
    if (insertCommitErr) {
      // GitHub commit succeeded but Supabase write failed. We don't roll
      // back the GitHub commit — it's the source of truth and the history
      // table is a convenience for the modal. Surface the warning and
      // continue with a partial success response.
      // eslint-disable-next-line no-console
      console.warn('[commit] commit_log insert failed', insertCommitErr.message);
    } else {
      const fileRows = resolved.map(r => ({
        commit_sha:       newCommit.sha,
        path:             r.input.path,
        operation:        r.input.operation,
        new_path:         r.input.new_path ?? null,
        last_edited_at:   r.input.last_edited_at,
        lines_added:      r.input.lines_added,
        lines_removed:    r.input.lines_removed,
        original_content: r.original_content,
        current_content:  r.content,
      }));
      const { error: insertFilesErr } = await supabase
        .from('commit_log_files')
        .insert(fileRows);
      if (insertFilesErr) {
        // eslint-disable-next-line no-console
        console.warn('[commit] commit_log_files insert failed', insertFilesErr.message);
      }
    }
  }

  // 9. Clear the now-committed pending rows so the staging layer and any
  // peer tabs see them gone. Scoped to the committing user — a peer
  // collaborator's pending rows on the same paths are untouched (they'll
  // need to rebase their local edits, but that's outside this route's
  // responsibility).
  const committedPaths = resolved.map(r => r.input.path);
  if (committedPaths.length > 0) {
    const { error: clearErr } = await supabase
      .from('pending_files')
      .delete()
      .eq('user_id', userId)
      .in('path', committedPaths);
    if (clearErr) {
      // eslint-disable-next-line no-console
      console.warn('[commit] pending_files clear failed', clearErr.message);
    }
  }

  return NextResponse.json({
    commit_sha: newCommit.sha,
    files: resolved.map(r => ({ path: r.input.path, operation: r.input.operation })),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Input validation for the multi-file shape.
// ────────────────────────────────────────────────────────────────────────────

interface ValidatedMultiFile {
  path:           string;
  operation:      PendingOperation;
  new_path:       string | null;
  content:        string | null | undefined;
  last_edited_at: string;
  lines_added:    number;
  lines_removed:  number;
}

function validateMultiFileInputs(
  raw: MultiFileInput[],
): { ok: true; files: ValidatedMultiFile[] } | { ok: false; errors: Array<{ index: number; errors: string[] }> } {
  const errors: Array<{ index: number; errors: string[] }> = [];
  const validated: ValidatedMultiFile[] = [];
  const seenPaths = new Set<string>();
  const seenNewPaths = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const f = raw[i];
    const e: string[] = [];

    if (!f || typeof f !== 'object') {
      errors.push({ index: i, errors: ['entry is not an object'] });
      continue;
    }
    if (!isValidRepoPath(f.path)) e.push('path is missing or invalid');
    if (!isPendingOperation(f.operation)) e.push(`operation must be one of edit, create, delete, rename, move`);
    if (typeof f.last_edited_at !== 'string' || !Number.isFinite(Date.parse(f.last_edited_at))) {
      e.push('last_edited_at must be an ISO-8601 string');
    }
    if (typeof f.lines_added !== 'number' || f.lines_added < 0) e.push('lines_added must be a non-negative number');
    if (typeof f.lines_removed !== 'number' || f.lines_removed < 0) e.push('lines_removed must be a non-negative number');

    const isRenameOrMove = f.operation === 'rename' || f.operation === 'move';
    if (isRenameOrMove) {
      if (!isValidRepoPath(f.new_path)) e.push(`new_path is required for operation '${f.operation}'`);
    } else if (f.new_path !== undefined && f.new_path !== null) {
      e.push(`new_path is only valid for operation 'rename' or 'move'`);
    }
    if (f.content !== undefined && f.content !== null && typeof f.content !== 'string') {
      e.push('content must be string, null, or omitted');
    }

    // Path conflict detection within the same commit.
    if (isValidRepoPath(f.path)) {
      if (seenPaths.has(f.path)) e.push(`path '${f.path}' appears more than once in this commit`);
      seenPaths.add(f.path);
    }
    if (isRenameOrMove && isValidRepoPath(f.new_path)) {
      if (seenNewPaths.has(f.new_path as string) || seenPaths.has(f.new_path as string)) {
        e.push(`new_path '${f.new_path as string}' conflicts with another entry in this commit`);
      }
      seenNewPaths.add(f.new_path as string);
    }

    if (e.length > 0) {
      errors.push({ index: i, errors: e });
      continue;
    }
    validated.push({
      path:           f.path,
      operation:      f.operation,
      new_path:       isRenameOrMove ? (f.new_path as string) : null,
      content:        f.content,
      last_edited_at: f.last_edited_at,
      lines_added:    Math.floor(f.lines_added),
      lines_removed:  Math.floor(f.lines_removed),
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, files: validated };
}

// ────────────────────────────────────────────────────────────────────────────
// setDeep — preserved from the pre-v1.2 commit route. Used only by the
// legacy patches path; the multi-file path doesn't touch
// skeleton.config.json structurally.
// ────────────────────────────────────────────────────────────────────────────
//
// Set a dot-path-addressed value inside an object. Handles:
//   'app.name'      → obj.app.name = value
//   'theme.colors'  → obj.theme.colors = value
//   'items.0.name'  → obj.items[0].name = value (numeric segment → array index)
function setDeep(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split('.');
  let cur: Record<string, unknown> | unknown[] = target;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg     = segments[i]!;
    const nextSeg = segments[i + 1]!;
    const nextIsIndex = /^\d+$/.test(nextSeg);

    if (Array.isArray(cur)) {
      const idx = parseInt(seg, 10);
      if (cur[idx] === undefined || cur[idx] === null || typeof cur[idx] !== 'object') {
        cur[idx] = nextIsIndex ? [] : {};
      }
      cur = cur[idx] as Record<string, unknown> | unknown[];
    } else {
      const obj = cur as Record<string, unknown>;
      if (obj[seg] === undefined || obj[seg] === null || typeof obj[seg] !== 'object') {
        obj[seg] = nextIsIndex ? [] : {};
      }
      cur = obj[seg] as Record<string, unknown> | unknown[];
    }
  }

  const last = segments[segments.length - 1]!;
  if (Array.isArray(cur)) {
    (cur as unknown[])[parseInt(last, 10)] = value;
  } else {
    (cur as Record<string, unknown>)[last] = value;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Thread 11 — conflict detection and simulation.
// ────────────────────────────────────────────────────────────────────────────

// A single file's conflict report — returned to the client inside the
// 409 response body so CommitConflictModal can render the resolution UI
// without an extra round-trip. Note `local` may be null for delete
// operations and `remote` may be null when the path is absent on dev.
export interface CommitConflictFile {
  path:                    string;
  operation:               PendingOperation;
  new_path:                string | null;
  /** What the developer is about to commit. Null for `delete`. */
  local_content:           string | null;
  /** Original snapshot the local edit was based on. Used by the modal
   *  to render the three-way preview (local vs base vs remote) and to
   *  detect "remote moved" vs "local + remote both moved". */
  base_content:            string | null;
  /** What dev currently holds at this path, fetched at conflict time.
   *  Null when the file doesn't exist on dev. */
  remote_content:          string | null;
  /** GitHub blob SHA for the remote — included so a follow-up resolved
   *  commit can detect "remote moved again" between conflict-fetch and
   *  retry. The client echoes this back; the route doesn't currently
   *  re-verify, but the field is stable enough for v1.3+ to act on. */
  remote_sha:              string | null;
  /** Why this file conflicts. One of:
   *    'remote_changed'      — base !== remote, edit/delete path
   *    'create_collision'    — local says create but path exists on dev
   *    'delete_remote_moved' — local says delete but base !== remote
   *    'rename_source_moved' — rename/move's old path differs from base
   *    'rename_dest_taken'   — rename/move's new path already exists */
  reason:                  ConflictReason;
}

type ConflictReason =
  | 'remote_changed'
  | 'create_collision'
  | 'delete_remote_moved'
  | 'rename_source_moved'
  | 'rename_dest_taken';

interface DetectArgs {
  repoName:          string;
  headers:           Record<string, string>;
  resolved:          Array<{
    input:           { path: string; operation: PendingOperation; new_path: string | null;
                      content: string | null | undefined };
    content:         string | null;
    original_content: string | null;
  }>;
  parentCommitSha:   string;
}

async function detectConflicts({ repoName, headers, resolved }: DetectArgs): Promise<CommitConflictFile[]> {
  // Gather every (path) we need to peek on dev. For renames/moves both
  // sides matter: the source must still equal `original_content`, the
  // destination must still be empty.
  const pathsToFetch = new Set<string>();
  for (const r of resolved) {
    pathsToFetch.add(r.input.path);
    if ((r.input.operation === 'rename' || r.input.operation === 'move') && r.input.new_path) {
      pathsToFetch.add(r.input.new_path);
    }
  }

  // Sequential fetches keep the error story simple; the request volume
  // is bounded by the commit's file count cap (200) and per-file content
  // size is small enough that parallel calls don't materially shrink
  // wall-clock for typical commits.
  const remoteByPath = new Map<string, { content: string | null; sha: string | null }>();
  for (const p of pathsToFetch) {
    const encoded = p.split('/').map(encodeURIComponent).join('/');
    const res = await fetch(
      `${GITHUB_API}/repos/${repoName}/contents/${encoded}?ref=${BRANCH}`,
      { headers },
    );
    if (res.status === 404) {
      remoteByPath.set(p, { content: null, sha: null });
      continue;
    }
    if (!res.ok) {
      // A real fetch failure: surface as a generic conflict on this
      // path so the user has actionable feedback rather than a silent
      // missed conflict.
      remoteByPath.set(p, { content: null, sha: null });
      continue;
    }
    const data = await res.json() as { content?: string; encoding?: string; sha?: string };
    if (data.content && data.encoding === 'base64') {
      remoteByPath.set(p, {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        sha:     data.sha ?? null,
      });
    } else {
      remoteByPath.set(p, { content: null, sha: data.sha ?? null });
    }
  }

  const conflicts: CommitConflictFile[] = [];
  for (const r of resolved) {
    const op       = r.input.operation;
    const remote   = remoteByPath.get(r.input.path) ?? { content: null, sha: null };
    const base     = r.original_content;

    if (op === 'edit') {
      // Conflict if dev's content at this path differs from the base
      // snapshot the local edit was made against.
      if (remote.content !== base) {
        conflicts.push({
          path: r.input.path, operation: op, new_path: null,
          local_content:  r.content, base_content: base,
          remote_content: remote.content, remote_sha: remote.sha,
          reason: 'remote_changed',
        });
      }
    } else if (op === 'delete') {
      // Conflict if remote no longer matches the base — the file we
      // were about to delete has been changed by someone else.
      if (remote.content !== base) {
        conflicts.push({
          path: r.input.path, operation: op, new_path: null,
          local_content: null, base_content: base,
          remote_content: remote.content, remote_sha: remote.sha,
          reason: 'delete_remote_moved',
        });
      }
    } else if (op === 'create') {
      // Conflict if dev already has a file at this path.
      if (remote.content !== null) {
        conflicts.push({
          path: r.input.path, operation: op, new_path: null,
          local_content: r.content, base_content: null,
          remote_content: remote.content, remote_sha: remote.sha,
          reason: 'create_collision',
        });
      }
    } else if (op === 'rename' || op === 'move') {
      const dest = remoteByPath.get(r.input.new_path as string) ?? { content: null, sha: null };
      // Source side: the file at `path` on dev should still match the
      // base content the rename was queued against.
      if (remote.content !== base) {
        conflicts.push({
          path: r.input.path, operation: op, new_path: r.input.new_path,
          local_content: r.content, base_content: base,
          remote_content: remote.content, remote_sha: remote.sha,
          reason: 'rename_source_moved',
        });
        continue;
      }
      // Destination side: must be empty on dev.
      if (dest.content !== null) {
        conflicts.push({
          path: r.input.path, operation: op, new_path: r.input.new_path,
          local_content: r.content, base_content: base,
          remote_content: dest.content, remote_sha: dest.sha,
          reason: 'rename_dest_taken',
        });
      }
    }
  }

  return conflicts;
}

// Dev-only conflict simulator. Echoes the request's file set back as a
// fabricated conflict response with synthetic remote content. Used by
// the DevShell's `?simulateCommitConflict=1` flow to exercise the
// CommitConflictModal end-to-end without engineering a real branch race.
async function simulateCommitConflict(body: MultiFileBody): Promise<NextResponse> {
  const files: CommitConflictFile[] = body.files.map((f) => {
    const local = typeof f.content === 'string' ? f.content : '';
    // Fabricate "remote" content by appending a marker line so the diff
    // viewer renders a visible divergence in the modal.
    const remote = `${local}\n// Simulated remote drift — added by another session.\n`;
    if (f.operation === 'edit') {
      return {
        path: f.path, operation: f.operation, new_path: null,
        local_content: local, base_content: local, remote_content: remote, remote_sha: null,
        reason: 'remote_changed' as const,
      };
    }
    if (f.operation === 'delete') {
      return {
        path: f.path, operation: f.operation, new_path: null,
        local_content: null, base_content: local, remote_content: remote, remote_sha: null,
        reason: 'delete_remote_moved' as const,
      };
    }
    if (f.operation === 'create') {
      return {
        path: f.path, operation: f.operation, new_path: null,
        local_content: local, base_content: null, remote_content: remote, remote_sha: null,
        reason: 'create_collision' as const,
      };
    }
    return {
      path: f.path, operation: f.operation, new_path: f.new_path ?? null,
      local_content: local, base_content: local, remote_content: remote, remote_sha: null,
      reason: 'rename_source_moved' as const,
    };
  });
  return NextResponse.json({
    error: 'conflict',
    message: 'Simulated commit conflict (dev-only).',
    files,
  }, { status: 409 });
}
