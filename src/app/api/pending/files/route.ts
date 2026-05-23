// src/app/api/pending/files/route.ts
// Pending-files staging API. Owned by the v1.2 commit-flow rebuild.
//
// GET  → list the caller's pending rows for hydration on DevShell mount.
// POST → upsert one or more rows. Used by the client staging module's
//        debounced flush and by flushDirty().
//
// Both endpoints scope by the authenticated user via requireDevRole() and
// rely on row-level security to enforce `user_id = auth.uid()` on the
// pending_files table. The server still sets `user_id` explicitly on
// inserts so the RLS WITH CHECK clause sees the right value.
//
// Protected: dev/collaborator only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import { validatePendingFileInput, type PendingFileRow } from '@/lib/pendingFiles';

export async function GET() {
  try {
    const user = await requireDevRole();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('pending_files')
      .select('*')
      .eq('user_id', user.id)
      .order('last_edited_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'list_failed', detail: error.message }, { status: 500 });
    }
    // Decorate each row with the convenience `is_new` flag the
    // @cactai-io/types PendingFile shape carries. The column doesn't exist
    // server-side; we derive it from operation === 'create'.
    const files = (data ?? []).map((r: PendingFileRow) => ({
      ...r,
      is_new: r.operation === 'create',
    }));
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

interface PostBody {
  files: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireDevRole();
    const body = (await req.json().catch(() => ({}))) as PostBody;

    if (!Array.isArray(body.files)) {
      return NextResponse.json({ error: 'invalid_body', detail: 'files must be an array' }, { status: 400 });
    }
    if (body.files.length === 0) {
      return NextResponse.json({ written: 0 });
    }
    if (body.files.length > 200) {
      // Defensive cap. A single flush should never carry this many rows
      // — Task 4's manager flushes one row per path per debounce; the
      // beacon path collects every dirty row but in practice that's a
      // handful, not hundreds.
      return NextResponse.json({ error: 'too_many_files', detail: 'max 200 per request' }, { status: 413 });
    }

    const rows: PendingFileRow[] = [];
    const errors: Array<{ index: number; errors: string[] }> = [];
    for (let i = 0; i < body.files.length; i++) {
      const result = validatePendingFileInput(body.files[i], user.id);
      if (result.ok) rows.push(result.row);
      else errors.push({ index: i, errors: result.errors });
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: 'validation_failed', detail: errors }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('pending_files')
      .upsert(rows, { onConflict: 'user_id,path' });
    if (error) {
      return NextResponse.json({ error: 'upsert_failed', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ written: rows.length });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
