// src/app/api/notifications/[id]/dismiss/route.ts
// Mark a notification dismissed for the current user.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { dismiss } from '@/lib/notifications.server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id }  = await params;
    await dismiss(id, session.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
