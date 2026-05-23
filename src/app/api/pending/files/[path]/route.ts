// src/app/api/pending/files/[path]/route.ts
// Discard a single pending row, keyed on (auth.uid(), path).
//
// The client encodes the path with encodeURIComponent — slashes become
// %2F so the whole path fits in one dynamic route segment. Next.js
// un-encodes params for us before this handler runs.
//
// Returns 204 on a successful delete. Returns 204 also when the row
// didn't exist — the client treats discards as idempotent (the local
// state has already been cleared and the server-side row may have been
// removed by another tab or never written at all).
//
// Protected: dev/collaborator only.

import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import { isValidRepoPath } from '@/lib/pendingFiles';

interface RouteCtx { params: Promise<{ path: string }> }

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const user = await requireDevRole();
    const { path } = await ctx.params;

    if (!isValidRepoPath(path)) {
      return NextResponse.json({ error: 'invalid_path' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('pending_files')
      .delete()
      .eq('user_id', user.id)
      .eq('path', path);
    if (error) {
      return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
