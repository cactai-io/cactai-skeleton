// src/app/api/git/commit/route.ts
//
// Commit a set of files to the customer's dev branch on GitHub. Backs
// the DevShell's "Commit to dev" button — the developer reviews staged
// edits in the PendingEditsModal, clicks Commit, and this route turns
// the request body into one git commit pushed via the GitHub Contents
// API.
//
// Three GitHub API calls per file: get current SHA (for the update),
// PUT new content, return updated SHA. We do a batched single commit
// via the Git Data API (createTree + createCommit + updateRef) so the
// developer sees one entry in their commit log per Commit action,
// regardless of how many files changed.
//
// Body shape:
//   {
//     branch:  'dev',                   // optional; defaults to 'dev'
//     message: 'Update X',              // commit message
//     paths:   ['src/app/page.tsx', 'src/old.tsx'], // OR omit → commit ALL pending
//     reverts_sha?: '<sha>',            // when this commit is a revert
//   }
//
// File content is read SERVER-SIDE from the customer DB's pending_files
// table — the staging layer (PendingFilesManager) flushes every edit
// there during the session, so by the time the developer clicks Commit
// the rows already exist with current_content (for edit/create) or
// new_path (for rename/move). After a successful push, the committed
// rows are deleted from pending_files.
//
// Auth: dev/collaborator. The GITHUB_TOKEN is the project's bot token
// set by the wizard with full repo scope. SUPABASE_SERVICE_KEY is used
// to read pending_files server-side.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

interface CommitBody {
  branch?:      string;
  message:      string;
  paths?:       string[];   // omit to commit ALL of this user's pending rows
  reverts_sha?: string;
}

interface PendingRow {
  path:             string;
  operation:        'edit' | 'create' | 'delete' | 'rename' | 'move';
  new_path:         string | null;
  current_content:  string | null;
}

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      'Authorization':        `Bearer ${token}`,
      'Accept':               'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type':         'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  return res;
}

export async function POST(req: NextRequest) {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const session = await requireAuth();
  if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo  = process.env.GITHUB_REPO_NAME;
  if (!githubToken || !githubRepo) {
    return NextResponse.json({ error: 'github_not_configured' }, { status: 412 });
  }

  let body: CommitBody;
  try { body = await req.json() as CommitBody; }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }); }

  if (!body.message) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 });
  }

  const branch = body.branch ?? 'dev';

  // Read pending rows for this user. When `paths` is supplied we filter
  // to that subset; otherwise we commit every pending row this user has.
  const supa  = createServiceSupabaseClient();
  let pendingQuery = supa
    .from('pending_files')
    .select('path, operation, new_path, current_content')
    .eq('user_id', session.id);
  if (Array.isArray(body.paths) && body.paths.length > 0) {
    pendingQuery = pendingQuery.in('path', body.paths);
  }
  const { data: pendingRows, error: pendingErr } = await pendingQuery;
  if (pendingErr) {
    return NextResponse.json({
      error:  'pending_query_failed',
      detail: pendingErr.message,
    }, { status: 502 });
  }
  const pending = (pendingRows ?? []) as PendingRow[];
  if (pending.length === 0) {
    return NextResponse.json({
      error:  'no_pending_files',
      detail: 'No pending files matched. The staging layer may not have flushed yet, or the paths supplied are not in pending_files.',
    }, { status: 400 });
  }

  // 1. Get the branch's current commit SHA + base tree SHA.
  const branchRes = await gh(githubToken, `/repos/${githubRepo}/branches/${encodeURIComponent(branch)}`);
  if (!branchRes.ok) {
    const detail = await branchRes.text().catch(() => '');
    return NextResponse.json({
      error: 'branch_lookup_failed',
      detail: `GitHub ${branchRes.status}: ${detail.slice(0, 200)}`,
    }, { status: 502 });
  }
  const branchInfo = await branchRes.json() as {
    commit?: { sha?: string; commit?: { tree?: { sha?: string } } };
  };
  const parentSha = branchInfo.commit?.sha;
  const baseTreeSha = branchInfo.commit?.commit?.tree?.sha;
  if (!parentSha || !baseTreeSha) {
    return NextResponse.json({ error: 'branch_sha_missing' }, { status: 502 });
  }

  // 2. Create a blob per file (for content). Deletes are represented as
  //    null SHA in the tree update so GitHub removes the path.
  const treeEntries: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha:  string | null;
  }> = [];

  for (const row of pending) {
    if (row.operation === 'delete') {
      treeEntries.push({ path: row.path, mode: '100644', type: 'blob', sha: null });
      continue;
    }
    if (row.operation === 'rename' || row.operation === 'move') {
      // Rename = delete-at-old-path + create-at-new-path. Content comes
      // from current_content (the staging layer copies the file's
      // existing content into the new row at rename time).
      if (!row.new_path || typeof row.current_content !== 'string') {
        return NextResponse.json({
          error:  'rename_row_incomplete',
          detail: `Pending rename for ${row.path} missing new_path or current_content`,
        }, { status: 502 });
      }
      treeEntries.push({ path: row.path, mode: '100644', type: 'blob', sha: null });
      const blobRes = await gh(githubToken, `/repos/${githubRepo}/git/blobs`, {
        method: 'POST',
        body:   JSON.stringify({ content: row.current_content, encoding: 'utf-8' }),
      });
      if (!blobRes.ok) {
        const detail = await blobRes.text().catch(() => '');
        return NextResponse.json({
          error:  'blob_create_failed',
          detail: `GitHub ${blobRes.status} for ${row.new_path}: ${detail.slice(0, 200)}`,
        }, { status: 502 });
      }
      const blob = await blobRes.json() as { sha?: string };
      if (!blob.sha) {
        return NextResponse.json({ error: 'blob_sha_missing', detail: row.new_path }, { status: 502 });
      }
      treeEntries.push({ path: row.new_path, mode: '100644', type: 'blob', sha: blob.sha });
      continue;
    }
    // edit + create: blob from current_content, place at row.path.
    if (typeof row.current_content !== 'string') {
      return NextResponse.json({
        error:  'content_missing',
        detail: `Pending row for ${row.path} (operation=${row.operation}) has null current_content`,
      }, { status: 502 });
    }
    const blobRes = await gh(githubToken, `/repos/${githubRepo}/git/blobs`, {
      method: 'POST',
      body:   JSON.stringify({ content: row.current_content, encoding: 'utf-8' }),
    });
    if (!blobRes.ok) {
      const detail = await blobRes.text().catch(() => '');
      return NextResponse.json({
        error:  'blob_create_failed',
        detail: `GitHub ${blobRes.status} for ${row.path}: ${detail.slice(0, 200)}`,
      }, { status: 502 });
    }
    const blob = await blobRes.json() as { sha?: string };
    if (!blob.sha) {
      return NextResponse.json({ error: 'blob_sha_missing', detail: row.path }, { status: 502 });
    }
    treeEntries.push({ path: row.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // 3. Create a new tree based on the parent commit's tree.
  const treeRes = await gh(githubToken, `/repos/${githubRepo}/git/trees`, {
    method: 'POST',
    body:   JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });
  if (!treeRes.ok) {
    const detail = await treeRes.text().catch(() => '');
    return NextResponse.json({
      error:  'tree_create_failed',
      detail: `GitHub ${treeRes.status}: ${detail.slice(0, 200)}`,
    }, { status: 502 });
  }
  const treeBody = await treeRes.json() as { sha?: string };
  if (!treeBody.sha) {
    return NextResponse.json({ error: 'tree_sha_missing' }, { status: 502 });
  }

  // 4. Create a commit linking the new tree to the previous head.
  const commitRes = await gh(githubToken, `/repos/${githubRepo}/git/commits`, {
    method: 'POST',
    body:   JSON.stringify({
      message: body.message,
      tree:    treeBody.sha,
      parents: [parentSha],
    }),
  });
  if (!commitRes.ok) {
    const detail = await commitRes.text().catch(() => '');
    return NextResponse.json({
      error:  'commit_create_failed',
      detail: `GitHub ${commitRes.status}: ${detail.slice(0, 200)}`,
    }, { status: 502 });
  }
  const commit = await commitRes.json() as { sha?: string };
  if (!commit.sha) {
    return NextResponse.json({ error: 'commit_sha_missing' }, { status: 502 });
  }

  // 5. Move the branch ref to the new commit.
  const refRes = await gh(
    githubToken,
    `/repos/${githubRepo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: 'PATCH',
      body:   JSON.stringify({ sha: commit.sha, force: false }),
    },
  );
  if (!refRes.ok) {
    const detail = await refRes.text().catch(() => '');
    return NextResponse.json({
      error:  'ref_update_failed',
      detail: `GitHub ${refRes.status}: ${detail.slice(0, 200)}`,
    }, { status: 502 });
  }

  // Commit succeeded — clear the pending_files rows that just landed
  // upstream. Best-effort: if the delete fails (network blip, etc.) the
  // rows remain and the developer's next commit attempt would either
  // re-commit the same content (no-op tree) or surface the conflict via
  // the file-tree's modified-dot indicator.
  const committedPaths = pending.map(r => r.path);
  void supa
    .from('pending_files')
    .delete()
    .eq('user_id', session.id)
    .in('path', committedPaths)
    .then(({ error: delErr }) => {
      if (delErr) console.warn('[git/commit] post-commit pending cleanup failed:', delErr.message);
    });

  return NextResponse.json({
    ok:            true,
    branch,
    commit_sha:    commit.sha,
    files_changed: pending.length,
    reverts_sha:   body.reverts_sha ?? null,
    paths:         committedPaths,
  });
}
