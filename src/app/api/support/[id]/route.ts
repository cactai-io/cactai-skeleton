// src/app/api/support/[id]/route.ts
// End-user view of one of their support tickets + the message thread, and
// posting a reply. Scoped to the caller's own ticket (created_by + tenant).
//
//   GET  /api/support/:id            → ticket + messages (chat thread)
//   POST /api/support/:id { body }   → append an end-user reply

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

async function ownedTicket(admin: ReturnType<typeof createServiceSupabaseClient>, ticketId: string, tenantId: string, userId: string) {
  const { data } = await admin
    .from('support_tickets')
    .select('id, subject, status, created_at, last_message_at, tenant_id, created_by')
    .eq('id', ticketId)
    .maybeSingle();
  if (!data) return null;
  // The end user may only touch their own ticket within their tenant.
  if (data.tenant_id !== tenantId || data.created_by !== userId) return null;
  return data;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (!session.tenant_id) return NextResponse.json({ error: 'no_tenant_scope' }, { status: 403 });
    const { id } = await ctx.params;

    const admin  = createServiceSupabaseClient();
    const ticket = await ownedTicket(admin, id, session.tenant_id, session.id);
    if (!ticket) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { data: messages, error } = await admin
      .from('support_messages')
      .select('id, author_kind, author_id, body, created_at')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: 'list_failed', detail: error.message }, { status: 502 });

    return NextResponse.json({
      ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status, created_at: ticket.created_at, last_message_at: ticket.last_message_at },
      messages: messages ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: err instanceof Error ? err.message : 'internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (!session.tenant_id) return NextResponse.json({ error: 'no_tenant_scope' }, { status: 403 });
    const { id } = await ctx.params;

    const payload = await req.json().catch(() => ({})) as { body?: string };
    const message = (payload.body ?? '').trim();
    if (!message) return NextResponse.json({ error: 'message_required' }, { status: 400 });

    const admin  = createServiceSupabaseClient();
    const ticket = await ownedTicket(admin, id, session.tenant_id, session.id);
    if (!ticket) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { error: mErr } = await admin
      .from('support_messages')
      .insert({ ticket_id: id, author_kind: 'end_user', author_id: session.id, body: message });
    if (mErr) return NextResponse.json({ error: 'reply_failed', detail: mErr.message }, { status: 502 });

    // Bump activity + reopen if the operator had marked it resolved/pending.
    await admin
      .from('support_tickets')
      .update({ last_message_at: new Date().toISOString(), status: 'open' })
      .eq('id', id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: err instanceof Error ? err.message : 'internal' }, { status: 500 });
  }
}
