// src/app/api/settings/collaborators/[id]/route.ts
// Removes a collaborator — deletes their platform_roles row so they can no
// longer access DevShell. Their app_users row and any data they own is preserved.
// Protected: dev only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }

    // Prevent removing yourself (you'd lose DevShell access in the same
    // turn) and prevent removing a dev role from this surface — the
    // panel's Remove button is only meant to revoke collaborator access.
    // Owner transfer / dev-role removal lives in a separate flow.
    if (id === user.id) {
      return NextResponse.json({
        error:  'cannot_remove_self',
        detail: 'Use the dashboard to remove your own access from a project.',
      }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    const { data: target, error: lookupErr } = await supabase
      .from('platform_roles')
      .select('user_id, role')
      .eq('user_id', id)
      .maybeSingle();
    if (lookupErr) {
      return NextResponse.json({ error: 'lookup_failed', detail: lookupErr.message }, { status: 502 });
    }
    if (!target) {
      return NextResponse.json({ error: 'not_a_member' }, { status: 404 });
    }
    if (target.role === 'dev') {
      return NextResponse.json({
        error:  'cannot_remove_dev',
        detail: 'Use the platform dashboard to transfer or remove a developer role.',
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('platform_roles')
      .delete()
      .eq('user_id', id)
      .eq('role', 'collaborator');

    if (error) {
      return NextResponse.json({ error: 'remove_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, removed: id });
  } catch (err) {
    return NextResponse.json({
      error:  'collaborator_remove_internal',
      detail: err instanceof Error ? err.message : 'unknown',
    }, { status: 500 });
  }
}
