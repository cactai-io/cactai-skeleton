// src/app/api/manage/email-config/test/route.ts
// Send a test invitation email using the current provider config. Lets the
// developer verify the config end-to-end before relying on it.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { randomBytes } from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.active_lens !== 'super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => null) as { to?: string } | null;
    const to   = (body?.to ?? '').trim().toLowerCase();
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const { sendInvitationEmail } = await import('@/lib/invitations.server');
    // Synthetic invitation that doesn't touch tenant_invitations table.
    // The user-facing accept page will 404 the test token; that's correct —
    // we're testing email delivery, not the acceptance flow.
    const fakeToken = randomBytes(16).toString('base64url');
    await sendInvitationEmail({
      invitation_id: 'test',
      to_email:      to,
      role:          'user',
      token:         fakeToken,
      invited_by:    session.id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'send_failed', detail: (err as Error).message }, { status: 502 });
  }
}
