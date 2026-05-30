// src/app/api/git/pending/route.ts
//
// List the current developer's pending file edits (rows in
// pending_files on the customer DB). Backs DevShell's PendingEditsModal
// + the file-tree's per-row "modified" indicator. Read-only — writes
// to pending_files happen from the staging layer inside DevShell
// (PendingFilesManager) or from /api/git/discard (Phase 3b-2).
//
// Returns the PendingFileSummary shape the FileTree component expects.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const session = await requireAuth();
  if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supa = createServiceSupabaseClient();

  // Scope to the requesting user's rows. RLS would do this too via
  // auth.uid(); we filter explicitly for clarity + so the result set
  // is bounded even if RLS is bypassed by the service-role client.
  const { data, error } = await supa
    .from('pending_files')
    .select('path, operation, new_path, lines_added, lines_removed, last_edited_at')
    .eq('user_id', session.id)
    .order('last_edited_at', { ascending: false });

  if (error) {
    return NextResponse.json({
      error:  'pending_files_query_failed',
      detail: error.message,
    }, { status: 502 });
  }

  const files = (data ?? []).map(r => ({
    path:          r.path,
    operation:     r.operation,
    newPath:       r.new_path ?? undefined,
    linesAdded:    r.lines_added ?? 0,
    linesRemoved:  r.lines_removed ?? 0,
    lastEditedAt:  r.last_edited_at,
  }));

  return NextResponse.json({ files });
}

// DELETE /api/git/pending           — discard ALL of this user's pending rows
// DELETE /api/git/pending?path=...  — discard one specific row
//
// Backs DevShell's per-row "Restore" affordance + the modal's "Discard
// all" action. RLS scopes by auth.uid(); we ALSO filter by user_id with
// the service-role client so the result is bounded even with RLS
// bypassed.
export async function DELETE(req: NextRequest) {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const session = await requireAuth();
  if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supa = createServiceSupabaseClient();
  const path = req.nextUrl.searchParams.get('path');

  let q = supa.from('pending_files').delete().eq('user_id', session.id);
  if (path) q = q.eq('path', path);
  const { error } = await q;
  if (error) {
    return NextResponse.json({
      error:  'pending_delete_failed',
      detail: error.message,
    }, { status: 502 });
  }

  return NextResponse.json({ ok: true, path: path ?? null });
}
