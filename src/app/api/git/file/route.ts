// src/app/api/git/file/route.ts
//
// Fetch a single file's text content from the customer's GitHub repo.
// Backs the DevShell's file-viewer in the file tree panel — when the
// developer clicks a row in the tree, the wrapper hits this with
// ?path=<path>&branch=<branch> and renders the response in the editor.
//
// Skeleton-side so GITHUB_TOKEN stays server-only. dev/collaborator
// gate prevents end-user enumeration of the repo's source.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

  const path   = req.nextUrl.searchParams.get('path');
  const branch = req.nextUrl.searchParams.get('branch') ?? 'dev';
  if (!path) return NextResponse.json({ error: 'missing_path' }, { status: 400 });

  // GitHub's contents API returns base64-encoded content for files up to
  // 1 MB. Above that, the API redirects to a download URL — we'd need a
  // second fetch. For DevShell-editable source files we're well under
  // the limit, so a single call suffices.
  const res = await fetch(
    `https://api.github.com/repos/${githubRepo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept':        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return NextResponse.json({
      error:  'file_fetch_failed',
      detail: `GitHub ${res.status}: ${detail.slice(0, 200)}`,
    }, { status: res.status === 404 ? 404 : 502 });
  }
  const body = await res.json() as {
    encoding?: string;
    content?:  string;
    sha?:      string;
    size?:     number;
  };

  if (body.encoding !== 'base64' || typeof body.content !== 'string') {
    return NextResponse.json({
      error:  'unexpected_response',
      detail: 'GitHub returned a non-base64 file payload; the file may be too large (>1MB) or a binary type.',
    }, { status: 502 });
  }

  // Decode base64 → utf8 string. atob is available in Edge/Node 20+
  // runtime; Buffer is the universal fallback.
  const decoded = typeof Buffer !== 'undefined'
    ? Buffer.from(body.content, 'base64').toString('utf8')
    : atob(body.content);

  return NextResponse.json({
    path,
    branch,
    content: decoded,
    sha:     body.sha,
    size:    body.size,
  });
}
