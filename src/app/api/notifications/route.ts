// src/app/api/notifications/route.ts
// Management-panel notifications list. Filters by the caller's session +
// active lens (broadcast notifications gated on tenant role).

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listForUser } from '@/lib/notifications.server';

export async function GET() {
  try {
    const session = await requireAuth();
    const lens    = (session.active_lens ?? null) as 'super_admin' | 'admin' | 'user' | null;
    const rows    = await listForUser(session.id, lens);
    return NextResponse.json({ notifications: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
