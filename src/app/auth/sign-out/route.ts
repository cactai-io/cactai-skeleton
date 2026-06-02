// src/app/auth/sign-out/route.ts
// Clears the Supabase session for the current request and audits the event.
// Called by the management-panel avatar menu's Sign out button via POST.

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import { getSessionUser } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getSessionUser();
    const supa = await createServerSupabaseClient();
    await supa.auth.signOut();
    if (user) {
      const { audit } = await import('@/lib/audit.server');
      await audit({
        user_id:   user.id,
        tenant_id: user.tenant_id,
        lens:      user.active_lens as never,
        action:    'session.signed_out',
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'sign_out_failed', detail: (err as Error).message }, { status: 500 });
  }
}
