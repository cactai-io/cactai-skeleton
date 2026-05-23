// src/app/api/pending/discard-all/route.ts
//
// Thread 12 — bulk discard of every pending row for the authenticated
// developer. Used by the DevShell's "Discard all changes" affordance
// in PendingEditsModal and the workspace panel header.
//
// The per-file equivalent is /api/pending/files/[path] DELETE; this
// route is the bulk variant.
//
// Returns 204 with no body on success. The client treats it as
// idempotent — calling discard-all when there's nothing pending is
// not an error.
//
// Protected: dev/collaborator only.

import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';

export async function POST() {
  try {
    const user = await requireDevRole();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('pending_files')
      .delete()
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
