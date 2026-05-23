// src/app/api/notifications/[id]/retry/route.ts
// Replay the recovery action for a retryable notification.
//
// Retry handler registry below. Each handler is keyed on condition_key
// and implements the recovery operation. On success the notification is
// resolved; on failure it stays pending so the user can try again.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getById, resolve as resolveNotification } from '@/lib/notifications.server';

type RetryHandler = (
  payload: Record<string, unknown>,
  user_id: string,
) => Promise<void>;

const retryHandlers: Record<string, RetryHandler> = {
  // Invitation send retry. Payload: { invitation_id }. Re-invokes the
  // invitation-email send for the row.
  'invitations.send_failure': async (payload, _user_id) => {
    const inv = (payload as { invitation_id?: string }).invitation_id;
    if (!inv) throw new Error('missing_invitation_id');
    const mod = await import('@/lib/invitations.server').catch(() => null);
    if (!mod || !mod.resendInvitation) throw new Error('invitations_module_missing');
    await mod.resendInvitation(inv);
  },
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id }  = await params;
    const row     = await getById(id);
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (row.action_kind !== 'retry') {
      return NextResponse.json({ error: 'not_retryable', kind: row.action_kind }, { status: 400 });
    }
    const handler = retryHandlers[row.condition_key];
    if (!handler) {
      return NextResponse.json({ error: 'no_handler_registered', condition_key: row.condition_key }, { status: 400 });
    }
    try {
      await handler(row.action_payload, session.id);
      await resolveNotification(row.condition_key, row.recipient_user_id ?? null);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: 'retry_failed', detail: (err as Error).message }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
