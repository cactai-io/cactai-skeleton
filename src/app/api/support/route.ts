// src/app/api/support/route.ts
// End-user support — list my tickets + open a new one. Each end user sees only
// their OWN tickets (created_by = their user id). Operators (the developer +
// scoped Portal staff) see all tickets across the app from the Cactai Portal.
//
//   GET  /api/support              → my tickets (newest activity first)
//   POST /api/support { subject, body } → open a ticket (+ first message)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session.tenant_id) return NextResponse.json({ tickets: [] });

    const admin = createServiceSupabaseClient();
    const { data, error } = await admin
      .from('support_tickets')
      .select('id, subject, status, created_at, last_message_at')
      .eq('tenant_id', session.tenant_id)
      .eq('created_by', session.id)
      .order('last_message_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'list_failed', detail: error.message }, { status: 502 });
    return NextResponse.json({ tickets: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: err instanceof Error ? err.message : 'internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.tenant_id) return NextResponse.json({ error: 'no_tenant_scope' }, { status: 403 });

    const body    = await req.json().catch(() => ({})) as { subject?: string; body?: string };
    const subject = (body.subject ?? '').trim();
    const message = (body.body ?? '').trim();
    if (!subject) return NextResponse.json({ error: 'subject_required' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'message_required' }, { status: 400 });

    const admin = createServiceSupabaseClient();
    const { data: ticket, error: tErr } = await admin
      .from('support_tickets')
      .insert({ tenant_id: session.tenant_id, created_by: session.id, subject, status: 'open' })
      .select('id, subject, status, created_at, last_message_at')
      .single();
    if (tErr || !ticket) {
      return NextResponse.json({ error: 'create_failed', detail: tErr?.message }, { status: 502 });
    }

    const { error: mErr } = await admin
      .from('support_messages')
      .insert({ ticket_id: ticket.id, author_kind: 'end_user', author_id: session.id, body: message });
    if (mErr) {
      return NextResponse.json({ error: 'create_failed', detail: mErr.message }, { status: 502 });
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: err instanceof Error ? err.message : 'internal' }, { status: 500 });
  }
}
