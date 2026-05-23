// src/app/api/invitations/[id]/route.ts
// Revoke an outstanding invitation. Only super_admin / admin on the
// invitation's tenant may revoke. The row is hard-deleted — there's nothing
// audit-worthy about an unaccepted invitation, and there are no foreign-key
// dependents until acceptance.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.active_lens !== 'super_admin' && session.active_lens !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (!session.tenant_id) {
      return NextResponse.json({ error: 'no_tenant_scope' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    }

    const admin = createServiceSupabaseClient();
    const { data: invitation } = await admin
      .from('tenant_invitations')
      .select('id, tenant_id, email, role')
      .eq('id', id)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (invitation.tenant_id !== session.tenant_id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { error } = await admin
      .from('tenant_invitations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'revoke_failed', detail: error.message }, { status: 502 });
    }

    const { audit } = await import('@/lib/audit.server');
    await audit({
      user_id:     session.id,
      tenant_id:   session.tenant_id,
      lens:        session.active_lens,
      action:      'invitation.revoked',
      target_type: 'tenant_invitation',
      target_id:   id,
      metadata:    { email: invitation.email, role: invitation.role },
    });

    return NextResponse.json({ revoked: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
