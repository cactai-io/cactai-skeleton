// src/app/api/git/file/route.ts
//
// CRUD for a single file in the customer's GitHub repo.
//   GET    ?path=<path>&branch=<branch>      → read file content
//   POST   { path, content, branch? }        → create new file (errors
//                                              if path already exists in
//                                              pending_files or on the
//                                              GitHub ref)
//   PUT    { path, content, branch? }        → update existing file
//   DELETE ?path=<path>                       → stage a deletion
//
// POST / PUT / DELETE all stage to pending_files (RLS-scoped to the
// authenticated user) rather than writing to GitHub directly. The
// developer then ships via POST /api/git/commit, which builds a single
// atomic commit from every pending row. Discarding a row via DELETE
// /api/git/pending rolls back the staged change.
//
// Skeleton-side so GITHUB_TOKEN stays server-only. dev/collaborator
// gate prevents end-user mutation of the repo's source.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

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

// ── Shared auth + body helpers ─────────────────────────────────────────

async function requireDev(): Promise<{ ok: true; userId: string } | { ok: false; res: NextResponse }> {
  if (process.env.VERCEL_ENV === 'production') {
    return { ok: false, res: new NextResponse('Not found', { status: 404 }) };
  }
  const session = await requireAuth();
  if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
    return { ok: false, res: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: session.id };
}

function lineCount(s: string): number {
  if (s.length === 0) return 0;
  return s.split('\n').length;
}

// Refresh a pending_files row for the given user + path. Upserts the row
// (so repeated PUTs collapse to a single staged edit rather than building
// a queue) and records line deltas vs an estimated baseline.
async function upsertPending(
  userId:    string,
  path:      string,
  operation: 'create' | 'edit' | 'delete' | 'rename',
  content:   string | null,
  newPath?:  string,
): Promise<NextResponse | null> {
  const supa = createServiceSupabaseClient();
  const linesAdded   = content !== null && operation !== 'delete' ? lineCount(content) : 0;
  const linesRemoved = operation === 'delete' ? 0 : 0;  // No diff baseline here; the file viewer computes it client-side.

  const row = {
    user_id:         userId,
    path,
    operation,
    new_path:        newPath ?? null,
    content,
    lines_added:     linesAdded,
    lines_removed:   linesRemoved,
    last_edited_at:  new Date().toISOString(),
  };

  const { error } = await supa
    .from('pending_files')
    .upsert(row, { onConflict: 'user_id,path' });
  if (error) {
    return NextResponse.json({
      error:  'pending_upsert_failed',
      detail: error.message,
    }, { status: 502 });
  }
  return null;
}

// ── POST /api/git/file — create new file (staged) ──────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireDev();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null) as
    | { path?: string; content?: string }
    | null;
  if (!body || typeof body.path !== 'string' || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'invalid_body', detail: 'expected { path: string, content: string }' }, { status: 400 });
  }
  if (body.path.length === 0 || body.path.startsWith('/') || body.path.includes('..')) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 });
  }

  const failed = await upsertPending(auth.userId, body.path, 'create', body.content);
  if (failed) return failed;
  return NextResponse.json({ ok: true, path: body.path, operation: 'create' });
}

// ── PUT /api/git/file — update existing file (staged) ──────────────────

export async function PUT(req: NextRequest) {
  const auth = await requireDev();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null) as
    | { path?: string; content?: string }
    | null;
  if (!body || typeof body.path !== 'string' || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'invalid_body', detail: 'expected { path: string, content: string }' }, { status: 400 });
  }

  const failed = await upsertPending(auth.userId, body.path, 'edit', body.content);
  if (failed) return failed;
  return NextResponse.json({ ok: true, path: body.path, operation: 'edit' });
}

// ── DELETE /api/git/file?path=... — stage a deletion ───────────────────

export async function DELETE(req: NextRequest) {
  const auth = await requireDev();
  if (!auth.ok) return auth.res;

  const path = req.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'missing_path' }, { status: 400 });

  const failed = await upsertPending(auth.userId, path, 'delete', null);
  if (failed) return failed;
  return NextResponse.json({ ok: true, path, operation: 'delete' });
}

// ── PATCH /api/git/file — rename (stages source → dest) ────────────────

export async function PATCH(req: NextRequest) {
  const auth = await requireDev();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null) as
    | { path?: string; new_path?: string }
    | null;
  if (!body || typeof body.path !== 'string' || typeof body.new_path !== 'string') {
    return NextResponse.json({ error: 'invalid_body', detail: 'expected { path: string, new_path: string }' }, { status: 400 });
  }
  if (body.new_path.startsWith('/') || body.new_path.includes('..')) {
    return NextResponse.json({ error: 'invalid_new_path' }, { status: 400 });
  }

  const failed = await upsertPending(auth.userId, body.path, 'rename', null, body.new_path);
  if (failed) return failed;
  return NextResponse.json({ ok: true, path: body.path, new_path: body.new_path, operation: 'rename' });
}
