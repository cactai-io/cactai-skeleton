// src/app/auth/callback/route.ts
// Supabase Auth callback — exchanges OAuth code for session, then runs the
// first-time bootstrap before falling through to the role-based redirect.
//
// Bootstrap rules (run only when the user has no app_users / tenant_members
// rows yet):
//
//   1. Pending invitation match: if tenant_invitations has an unaccepted,
//      unexpired row matching this user's email, accept it. Creates the
//      app_users row, inserts a tenant_members row with the invited role,
//      and marks the invitation accepted_at = NOW(). This path is checked
//      first regardless of signup_mode — an active invitation always wins
//      over the open-signup branches.
//
//   2. signup_mode resolution (v1.2.4):
//      - single_user_shared          → app_users row + tenant_members on
//                                      the default tenant with role='user'.
//      - single_user_isolated        → app_users + NEW tenant + tenant_members
//                                      with role='user' on that new tenant.
//      - multi_user_single_workspace → app_users + tenant_members on the
//                                      default tenant. Role assignment:
//                                      first signup gets 'super_admin'
//                                      (becomes the owner of the workspace);
//                                      every subsequent open signup is
//                                      rejected with invitation_required.
//      - multi_user_multi_workspace  → app_users + NEW tenant + three
//                                      tenant_members rows (super_admin,
//                                      admin, user) on that new tenant.
//
// This file is the only place that creates app_users / tenant_members rows
// for new sign-ups via Supabase Auth. Direct schema seeding (the
// customer-bootstrap helper) handles the developer's own seed at provision
// time.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSessionUser, getPostLoginRedirect } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';
import {
  DEFAULT_SIGNUP_MODE,
  isSignupMode,
  SIGNUP_MODE_KEY,
  type SignupMode,
} from '@/lib/signup-mode';

type InvitedRole = 'super_admin' | 'admin' | 'user';

type BootstrapFailure = 'invitation_required' | 'bootstrap_failed';

async function readSignupMode(): Promise<SignupMode> {
  const admin = createServiceSupabaseClient();
  const { data, error } = await admin
    .from('project_state')
    .select('decisions')
    .eq('project_id', endpoints.projectId)
    .maybeSingle();

  if (error || !data) return DEFAULT_SIGNUP_MODE;
  const decisions = (data.decisions as Record<string, unknown> | null) ?? {};
  const stored    = decisions[SIGNUP_MODE_KEY];
  return isSignupMode(stored) ? stored : DEFAULT_SIGNUP_MODE;
}

// Returns true when the user already has app_users / tenant_members records
// — i.e. bootstrap has already run for them before.
async function userIsBootstrapped(userId: string): Promise<boolean> {
  const admin = createServiceSupabaseClient();
  const { data } = await admin
    .from('app_users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  return !!data;
}

// Returns the default tenant id (the oldest tenant row by created_at). The
// customer-bootstrap helper creates exactly one tenant at provision time;
// this query just finds it.
async function getDefaultTenantId(): Promise<string | null> {
  const admin = createServiceSupabaseClient();
  const { data } = await admin
    .from('tenants')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);
  return (data ?? [])[0]?.id ?? null;
}

// True if the default tenant already has at least one super_admin member.
// Used by multi_user_single_workspace mode to distinguish the first signup
// (claims ownership) from subsequent signups (must be invited).
async function defaultTenantHasOwner(tenantId: string): Promise<boolean> {
  const admin = createServiceSupabaseClient();
  const { data } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('role', 'super_admin')
    .eq('status', 'active')
    .limit(1);
  return (data ?? []).length > 0;
}

// Step 1 of bootstrap: check for a pending invitation matching this email.
// Returns null on success (caller continues); a failure code if the
// invitation existed but the seed failed.
async function tryInvitationPath(
  userId: string,
  email: string,
): Promise<{ status: 'no_invitation' } | { status: 'accepted' } | { status: 'failed' }> {
  const admin = createServiceSupabaseClient();
  const { audit } = await import('@/lib/audit.server');

  const { data: invitations } = await admin
    .from('tenant_invitations')
    .select('id, tenant_id, role, expires_at, accepted_at')
    .eq('email', email)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1);

  const invitation = (invitations ?? [])[0] as
    | { id: string; tenant_id: string; role: InvitedRole; expires_at: string; accepted_at: string | null }
    | undefined;

  if (!invitation) return { status: 'no_invitation' };

  // app_users insert
  try {
    const { error } = await admin
      .from('app_users')
      .insert({ id: userId, email, display_name: null });
    if (error) {
      await audit({
        user_id: userId, tenant_id: invitation.tenant_id, lens: null,
        action: 'bootstrap.failed', target_type: 'app_user', target_id: userId,
        metadata: { step: 'app_users_insert', via: 'invitation', invitation_id: invitation.id, error: error.message },
      });
      return { status: 'failed' };
    }
  } catch (err) {
    await audit({
      user_id: userId, tenant_id: invitation.tenant_id, lens: null,
      action: 'bootstrap.failed', target_type: 'app_user', target_id: userId,
      metadata: { step: 'app_users_insert', via: 'invitation', invitation_id: invitation.id, error: (err as Error).message },
    });
    return { status: 'failed' };
  }
  await audit({
    user_id: userId, tenant_id: null, lens: null,
    action: 'user.bootstrapped', target_type: 'app_user', target_id: userId,
    metadata: { via: 'invitation', invitation_id: invitation.id, email },
  });

  // tenant_members insert
  try {
    const { error } = await admin.from('tenant_members').insert({
      user_id:   userId,
      tenant_id: invitation.tenant_id,
      role:      invitation.role,
      status:    'active',
    });
    if (error) {
      await audit({
        user_id: userId, tenant_id: invitation.tenant_id, lens: null,
        action: 'bootstrap.failed', target_type: 'tenant_member', target_id: userId,
        metadata: { step: 'tenant_members_insert', via: 'invitation', invitation_id: invitation.id, role: invitation.role, error: error.message },
      });
      return { status: 'failed' };
    }
  } catch (err) {
    await audit({
      user_id: userId, tenant_id: invitation.tenant_id, lens: null,
      action: 'bootstrap.failed', target_type: 'tenant_member', target_id: userId,
      metadata: { step: 'tenant_members_insert', via: 'invitation', invitation_id: invitation.id, role: invitation.role, error: (err as Error).message },
    });
    return { status: 'failed' };
  }
  await audit({
    user_id: userId, tenant_id: invitation.tenant_id, lens: null,
    action: 'tenant_member.created', target_type: 'tenant_member', target_id: userId,
    metadata: { role: invitation.role, via: 'invitation', invitation_id: invitation.id },
  });

  // Mark invitation accepted
  try {
    const { error } = await admin
      .from('tenant_invitations')
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq('id', invitation.id);
    if (error) {
      await audit({
        user_id: userId, tenant_id: invitation.tenant_id, lens: null,
        action: 'bootstrap.failed', target_type: 'tenant_invitation', target_id: invitation.id,
        metadata: { step: 'invitation_accept_update', via: 'invitation', invitation_id: invitation.id, error: error.message },
      });
      return { status: 'failed' };
    }
  } catch (err) {
    await audit({
      user_id: userId, tenant_id: invitation.tenant_id, lens: null,
      action: 'bootstrap.failed', target_type: 'tenant_invitation', target_id: invitation.id,
      metadata: { step: 'invitation_accept_update', via: 'invitation', invitation_id: invitation.id, error: (err as Error).message },
    });
    return { status: 'failed' };
  }
  await audit({
    user_id: userId, tenant_id: invitation.tenant_id, lens: null,
    action: 'invitation.accepted', target_type: 'tenant_invitation', target_id: invitation.id,
    metadata: { role: invitation.role, email },
  });

  return { status: 'accepted' };
}

// Seed an app_users row. Pulled out so each mode path can stop and report
// 'bootstrap_failed' on this step without duplicating try/catch.
// Returns { ok: true } on success or { ok: false, error } so the caller
// can include the error in the audit row's metadata.
async function insertAppUser(userId: string, email: string): Promise<{ ok: boolean; error: string | null }> {
  const admin = createServiceSupabaseClient();
  try {
    const { error } = await admin.from('app_users').insert({
      id: userId, email, display_name: null,
    });
    return { ok: !error, error: error?.message ?? null };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Create a brand-new tenant for an open signup. Used by the *_isolated and
// multi_user_multi_workspace modes. Returns the new tenant id or null on
// failure, with the error string so the caller can audit it.
async function createTenantFor(displayName: string): Promise<{ tenantId: string | null; error: string | null }> {
  const admin = createServiceSupabaseClient();
  try {
    const { data, error } = await admin
      .from('tenants')
      .insert({ display_name: displayName })
      .select('id')
      .single();
    if (error || !data) return { tenantId: null, error: error?.message ?? 'no_data' };
    return { tenantId: data.id as string, error: null };
  } catch (err) {
    return { tenantId: null, error: (err as Error).message };
  }
}

// Step 2 of bootstrap: signup_mode-driven open-signup paths. Only reached
// when tryInvitationPath returned 'no_invitation'. Per locked audit decisions:
// emit granular per-step rows (user.bootstrapped, tenant.created,
// tenant_member.created, signup.rejected) inline at each successful step,
// and bootstrap.failed at every failure return with metadata.step + .mode.
async function applySignupMode(
  userId: string,
  email: string,
  mode: SignupMode,
): Promise<null | BootstrapFailure> {
  const admin = createServiceSupabaseClient();
  const { audit } = await import('@/lib/audit.server');

  // Shared helper: write user.bootstrapped if app_users insert succeeds,
  // bootstrap.failed otherwise.
  async function bootstrapAppUser(): Promise<boolean> {
    const r = await insertAppUser(userId, email);
    if (!r.ok) {
      await audit({
        user_id: userId, tenant_id: null, lens: null,
        action: 'bootstrap.failed', target_type: 'app_user', target_id: userId,
        metadata: { step: 'app_users_insert', mode, error: r.error },
      });
      return false;
    }
    await audit({
      user_id: userId, tenant_id: null, lens: null,
      action: 'user.bootstrapped', target_type: 'app_user', target_id: userId,
      metadata: { mode, email },
    });
    return true;
  }

  // Shared helper: insert one tenant_members row and audit success/failure.
  async function insertMember(tenantId: string, role: 'super_admin' | 'admin' | 'user'): Promise<boolean> {
    const { error } = await admin.from('tenant_members').insert({
      user_id:   userId,
      tenant_id: tenantId,
      role,
      status:    'active',
    });
    if (error) {
      await audit({
        user_id: userId, tenant_id: tenantId, lens: null,
        action: 'bootstrap.failed', target_type: 'tenant_member', target_id: userId,
        metadata: { step: 'tenant_members_insert', mode, role, error: error.message },
      });
      return false;
    }
    await audit({
      user_id: userId, tenant_id: tenantId, lens: null,
      action: 'tenant_member.created', target_type: 'tenant_member', target_id: userId,
      metadata: { role, mode },
    });
    return true;
  }

  if (mode === 'single_user_shared') {
    if (!await bootstrapAppUser()) return 'bootstrap_failed';
    const tenantId = await getDefaultTenantId();
    if (!tenantId) {
      await audit({
        user_id: userId, tenant_id: null, lens: null,
        action: 'bootstrap.failed', target_type: 'tenant', target_id: null,
        metadata: { step: 'default_tenant_lookup', mode, error: 'no_default_tenant' },
      });
      return 'bootstrap_failed';
    }
    if (!await insertMember(tenantId, 'user')) return 'bootstrap_failed';
    return null;
  }

  if (mode === 'single_user_isolated') {
    if (!await bootstrapAppUser()) return 'bootstrap_failed';
    const tenantRes = await createTenantFor(email);
    if (!tenantRes.tenantId) {
      await audit({
        user_id: userId, tenant_id: null, lens: null,
        action: 'bootstrap.failed', target_type: 'tenant', target_id: null,
        metadata: { step: 'tenant_create', mode, error: tenantRes.error },
      });
      return 'bootstrap_failed';
    }
    await audit({
      user_id: userId, tenant_id: tenantRes.tenantId, lens: null,
      action: 'tenant.created', target_type: 'tenant', target_id: tenantRes.tenantId,
      metadata: { mode, display_name: email },
    });
    if (!await insertMember(tenantRes.tenantId, 'user')) return 'bootstrap_failed';
    return null;
  }

  if (mode === 'multi_user_single_workspace') {
    const tenantId = await getDefaultTenantId();
    if (!tenantId) {
      await audit({
        user_id: userId, tenant_id: null, lens: null,
        action: 'bootstrap.failed', target_type: 'tenant', target_id: null,
        metadata: { step: 'default_tenant_lookup', mode, error: 'no_default_tenant' },
      });
      return 'bootstrap_failed';
    }
    const hasOwner = await defaultTenantHasOwner(tenantId);
    if (hasOwner) {
      // Workspace already has an owner; subsequent signups need an
      // invitation. Caller will sign the user out.
      await audit({
        user_id: userId, tenant_id: tenantId, lens: null,
        action: 'signup.rejected', target_type: 'app_user', target_id: userId,
        metadata: { mode, reason: 'invitation_required', email },
      });
      return 'invitation_required';
    }
    // First signup claims ownership. Seed all three roles on the default
    // tenant so the owner can operate the workspace as super_admin/admin/user
    // via the lens switcher.
    if (!await bootstrapAppUser()) return 'bootstrap_failed';
    const rows = (['super_admin', 'admin', 'user'] as const).map(role => ({
      user_id:   userId,
      tenant_id: tenantId,
      role,
      status:    'active',
    }));
    const { error } = await admin.from('tenant_members').insert(rows);
    if (error) {
      await audit({
        user_id: userId, tenant_id: tenantId, lens: null,
        action: 'bootstrap.failed', target_type: 'tenant_member', target_id: userId,
        metadata: { step: 'tenant_members_insert', mode, error: error.message },
      });
      return 'bootstrap_failed';
    }
    for (const role of ['super_admin', 'admin', 'user'] as const) {
      await audit({
        user_id: userId, tenant_id: tenantId, lens: null,
        action: 'tenant_member.created', target_type: 'tenant_member', target_id: userId,
        metadata: { role, mode },
      });
    }
    return null;
  }

  // multi_user_multi_workspace
  if (!await bootstrapAppUser()) return 'bootstrap_failed';
  const tenantRes = await createTenantFor(email);
  if (!tenantRes.tenantId) {
    await audit({
      user_id: userId, tenant_id: null, lens: null,
      action: 'bootstrap.failed', target_type: 'tenant', target_id: null,
      metadata: { step: 'tenant_create', mode, error: tenantRes.error },
    });
    return 'bootstrap_failed';
  }
  await audit({
    user_id: userId, tenant_id: tenantRes.tenantId, lens: null,
    action: 'tenant.created', target_type: 'tenant', target_id: tenantRes.tenantId,
    metadata: { mode, display_name: email },
  });
  const mmRows = (['super_admin', 'admin', 'user'] as const).map(role => ({
    user_id:   userId,
    tenant_id: tenantRes.tenantId!,
    role,
    status:    'active',
  }));
  const mmIns = await admin.from('tenant_members').insert(mmRows);
  if (mmIns.error) {
    await audit({
      user_id: userId, tenant_id: tenantRes.tenantId, lens: null,
      action: 'bootstrap.failed', target_type: 'tenant_member', target_id: userId,
      metadata: { step: 'tenant_members_insert', mode, error: mmIns.error.message },
    });
    return 'bootstrap_failed';
  }
  for (const role of ['super_admin', 'admin', 'user'] as const) {
    await audit({
      user_id: userId, tenant_id: tenantRes.tenantId, lens: null,
      action: 'tenant_member.created', target_type: 'tenant_member', target_id: userId,
      metadata: { role, mode },
    });
  }
  return null;
}

// Top-level bootstrap. Tries invitation path first; falls through to the
// signup-mode path on no-invitation. Returns null on success.
async function bootstrapUser(userId: string, email: string): Promise<null | BootstrapFailure> {
  const invitationResult = await tryInvitationPath(userId, email);
  if (invitationResult.status === 'accepted')     return null;
  if (invitationResult.status === 'failed')       return 'bootstrap_failed';

  const mode = await readSignupMode();
  return applySignupMode(userId, email, mode);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code       = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=callback_failed', requestUrl.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    endpoints.supabaseUrl,
    endpoints.supabaseAnonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch { /* Server Components cannot set cookies */ }
        },
      },
    },
  );

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    return NextResponse.redirect(new URL('/auth/login?error=callback_failed', requestUrl.origin));
  }

  // We have a session at this point. Fetch the auth user directly — not via
  // getSessionUser, which would fail-closed for a brand-new user with no
  // platform_roles / tenant_members rows yet.
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.redirect(new URL('/auth/login?error=callback_failed', requestUrl.origin));
  }

  // First-time? Run bootstrap.
  const bootstrapped = await userIsBootstrapped(authUser.id);
  if (!bootstrapped) {
    const failure = await bootstrapUser(authUser.id, authUser.email ?? '');
    if (failure === 'invitation_required') {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/auth/login?error=invitation_required', requestUrl.origin));
    }
    if (failure === 'bootstrap_failed') {
      return NextResponse.redirect(new URL('/auth/login?error=bootstrap_failed', requestUrl.origin));
    }
  }

  // Now read the user through getSessionUser — bootstrap above guarantees
  // they have at least one tenant_members row (or are an existing user who
  // already did).
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login?error=callback_failed', requestUrl.origin));
  }
  return NextResponse.redirect(new URL(getPostLoginRedirect(session), requestUrl.origin));
}
