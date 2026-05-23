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

    const supabase = createServiceSupabaseClient();

    // Delete from platform_roles (correct table — not app_users).
    const { error } = await supabase
      .from('platform_roles')
      .delete()
      .eq('user_id', id)
      .eq('role', 'collaborator');

    if (error) {
      return NextResponse.json({ error: 'remove_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ removed: true });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
