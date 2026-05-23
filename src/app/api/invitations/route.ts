// src/app/api/invitations/route.ts
// Manages tenant invitations. Only super_admin or admin (relative to the
// current active_lens) may create invitations; invitations expire 7 days
// after creation per the locked default. Tokens are random URL-safe strings.
//
// Endpoints:
//   POST /api/invitations  { email, role }      → create invitation
//   GET  /api/invitations                       → list outstanding invitations
//   DELETE /api/invitations/:id                 → revoke (see [id]/route.ts)
//
// The actual invitation acceptance happens at /auth/accept-invitation/[token].

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

type InviteRole = 'super_admin' | 'admin' | 'user';
const VALID_ROLES = new Set<InviteRole>(['super_admin', 'admin', 'user']);

const DEFAULT_EXPIRY_DAYS = 7;

function generateToken(): string {
  // 32 random bytes → 43-char URL-safe base64.
  return randomBytes(32).toString('base64url');
}

function canInviteRole(callerLens: InviteRole, requestedRole: InviteRole): boolean {
  // super_admin can invite anyone; admin can invite admin/user but not
  // super_admin; user can't invite at all.
  if (callerLens === 'super_admin') return true;
  if (callerLens === 'admin')       return requestedRole !== 'super_admin';
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    // session.active_lens is `string | null` on the JWT shape; narrow to
    // InviteRole via the registry check so downstream calls accept it.
    const lens = session.active_lens as InviteRole | null;
    if (!lens || !VALID_ROLES.has(lens)) {
      return NextResponse.json({ error: 'no_active_lens' }, { status: 403 });
    }
    if (!session.tenant_id) {
      return NextResponse.json({ error: 'no_tenant_scope' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) as { email?: string; role?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    const role  = body.role as InviteRole | undefined;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (!role || !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
    }
    if (!canInviteRole(lens, role)) {
      return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
    }

    const admin = createServiceSupabaseClient();

    // Don't create duplicate live invitations for the same email + tenant +
    // role; return the existing token instead so the inviter can re-share.
    const { data: existing } = await admin
      .from('tenant_invitations')
      .select('id, token, expires_at')
      .eq('tenant_id', session.tenant_id)
      .eq('email', email)
      .eq('role', role)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        id:         existing.id,
        email,
        role,
        token:      existing.token,
        expires_at: existing.expires_at,
        reused:     true,
      });
    }

    const token   = generateToken();
    const expires = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: created, error } = await admin
      .from('tenant_invitations')
      .insert({
        tenant_id:  session.tenant_id,
        email,
        role,
        token,
        invited_by: session.id,
        expires_at: expires,
      })
      .select('id, expires_at')
      .single();

    if (error || !created) {
      return NextResponse.json({ error: 'invitation_create_failed', detail: error?.message }, { status: 502 });
    }

    // Audit + email-send fan-out. Audit is best-effort; email may fail and
    // emit its own notification — invitation row still exists either way.
    const { audit } = await import('@/lib/audit.server');
    await audit({
      user_id:     session.id,
      tenant_id:   session.tenant_id,
      lens:        lens,
      action:      'invitation.created',
      target_type: 'tenant_invitation',
      target_id:   created.id as string,
      metadata:    { email, role, expires_at: created.expires_at },
    });

    // Trigger the invitation email send. Provider routing
    // (Supabase Auth vs Resend vs share-link-only) is decided inside
    // sendInvitationEmail based on stored project settings.
    try {
      const { sendInvitationEmail } = await import('@/lib/invitations.server');
      await sendInvitationEmail({
        invitation_id: created.id as string,
        to_email:      email,
        role,
        token,
        invited_by:    session.id,
      });
    } catch (err) {
      // Don't fail the POST — the row exists, the inviter has the share
      // link. The notification system has already recorded the send error.
      // eslint-disable-next-line no-console
      console.warn('[invitations] email send failed', err);
    }

    return NextResponse.json({
      id:         created.id,
      email,
      role,
      token,
      expires_at: created.expires_at,
      reused:     false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session.tenant_id) {
      return NextResponse.json({ invitations: [] });
    }
    // Only super_admin / admin can see outstanding invitations.
    if (session.active_lens !== 'super_admin' && session.active_lens !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const admin = createServiceSupabaseClient();
    const { data, error } = await admin
      .from('tenant_invitations')
      .select('id, email, role, expires_at, accepted_at, invited_by, created_at')
      .eq('tenant_id', session.tenant_id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'list_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ invitations: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
