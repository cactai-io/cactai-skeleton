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
//     files: [
//       { path: 'src/app/page.tsx', content: '...', operation: 'update' },
//       { path: 'src/old.tsx',                       operation: 'delete' },
//     ],
//     reverts_sha?: '<sha>',            // when this commit is a revert
//   }
//
// Auth: dev/collaborator. The GITHUB_TOKEN is the project's bot token
// set by the wizard with full repo scope.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

interface CommitFile {
  path:      string;
  content?:  string;   // required for update + create; omitted for delete
  operation: 'update' | 'create' | 'delete';
}

interface CommitBody {
  branch?:  string;
  message:  string;
  files:    CommitFile[];
  reverts_sha?: string;
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

  if (!body.message || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: 'message_and_files_required' }, { status: 400 });
  }

  const branch = body.branch ?? 'dev';

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

  for (const file of body.files) {
    if (file.operation === 'delete') {
      treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
      continue;
    }
    if (typeof file.content !== 'string') {
      return NextResponse.json({
        error:  'content_required_for_non_delete',
        detail: `File ${file.path} has operation=${file.operation} but no content field`,
      }, { status: 400 });
    }
    const blobRes = await gh(githubToken, `/repos/${githubRepo}/git/blobs`, {
      method: 'POST',
      body:   JSON.stringify({ content: file.content, encoding: 'utf-8' }),
    });
    if (!blobRes.ok) {
      const detail = await blobRes.text().catch(() => '');
      return NextResponse.json({
        error:  'blob_create_failed',
        detail: `GitHub ${blobRes.status} for ${file.path}: ${detail.slice(0, 200)}`,
      }, { status: 502 });
    }
    const blob = await blobRes.json() as { sha?: string };
    if (!blob.sha) {
      return NextResponse.json({ error: 'blob_sha_missing', detail: file.path }, { status: 502 });
    }
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
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

  return NextResponse.json({
    ok:           true,
    branch,
    commit_sha:   commit.sha,
    files_changed: body.files.length,
    reverts_sha:  body.reverts_sha ?? null,
  });
}
