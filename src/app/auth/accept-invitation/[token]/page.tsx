// src/app/auth/accept-invitation/[token]/page.tsx
// Landing page reached when someone clicks an invitation link. Resolves the
// invitation server-side: if it's valid (unaccepted + unexpired) and matches
// an already-signed-in user's email, accept it immediately and bounce to
// /app. Otherwise show a sign-in/sign-up prompt that, on completion via
// /auth/callback, will pick up the invitation by email match.
//
// Tokens are single-use — accepting flips accepted_at = NOW() and inserts
// the tenant_members row.

import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase.server';
import Link from 'next/link';

interface Props {
  params: Promise<{ token: string }>;
}

type InviteRole = 'super_admin' | 'admin' | 'user';

interface InvitationRow {
  id:           string;
  tenant_id:    string;
  email:        string;
  role:         InviteRole;
  expires_at:   string;
  accepted_at:  string | null;
}

async function loadInvitation(token: string): Promise<InvitationRow | null> {
  const admin = createServiceSupabaseClient();
  const { data } = await admin
    .from('tenant_invitations')
    .select('id, tenant_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle();
  return (data as InvitationRow | null) ?? null;
}

async function acceptForUser(invitation: InvitationRow, userId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createServiceSupabaseClient();

  // Ensure app_users row exists (it may not, for a fresh user signing in
  // for the first time through the invitation link).
  await admin.from('app_users').upsert({
    id:           userId,
    email:        invitation.email,
    display_name: null,
  }, { onConflict: 'id' });

  const { error: mErr } = await admin.from('tenant_members').insert({
    user_id:   userId,
    tenant_id: invitation.tenant_id,
    role:      invitation.role,
    status:    'active',
  });
  if (mErr && !/duplicate|already exists|unique/i.test(mErr.message)) {
    return { ok: false, error: mErr.message };
  }

  const { error: iErr } = await admin
    .from('tenant_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', invitation.id);
  if (iErr) return { ok: false, error: iErr.message };

  return { ok: true };
}

export default async function AcceptInvitationPage({ params }: Props) {
  const { token } = await params;

  const invitation = await loadInvitation(token);
  if (!invitation) {
    return (
      <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
        <h1>Invitation not found</h1>
        <p>This invitation link is invalid. Ask your inviter to send a new one.</p>
        <Link href="/auth/login">Sign in</Link>
      </main>
    );
  }
  if (invitation.accepted_at) {
    return (
      <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
        <h1>Invitation already used</h1>
        <p>This invitation has been accepted. Sign in to continue.</p>
        <Link href="/auth/login">Sign in</Link>
      </main>
    );
  }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return (
      <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
        <h1>Invitation expired</h1>
        <p>This invitation expired on {new Date(invitation.expires_at).toLocaleString()}. Ask your inviter to send a new one.</p>
        <Link href="/auth/login">Sign in</Link>
      </main>
    );
  }

  // If there's already a session AND it matches the invitation's email,
  // accept immediately and bounce.
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if ((user.email ?? '').toLowerCase() !== invitation.email.toLowerCase()) {
      return (
        <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
          <h1>Email mismatch</h1>
          <p>
            This invitation was sent to <strong>{invitation.email}</strong> but you're signed in as
            <strong> {user.email}</strong>. Sign out and try again with the invited email.
          </p>
        </main>
      );
    }
    const result = await acceptForUser(invitation, user.id);
    if (result.ok) {
      redirect('/app');
    }
    return (
      <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
        <h1>Couldn't accept invitation</h1>
        <p>Something went wrong: {result.error ?? 'unknown error'}. Please try again.</p>
      </main>
    );
  }

  // No session — prompt sign in / sign up. After they sign in, /auth/callback
  // will match this invitation by email and accept it as part of bootstrap.
  return (
    <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h1>You've been invited</h1>
      <p>
        Sign in as <strong>{invitation.email}</strong> to join as <strong>{invitation.role.replace('_', ' ')}</strong>.
      </p>
      <Link href={`/auth/login?invited=${encodeURIComponent(invitation.email)}`}>Sign in or create an account</Link>
    </main>
  );
}
