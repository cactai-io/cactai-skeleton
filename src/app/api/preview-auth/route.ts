// src/app/api/preview-auth/route.ts
//
// Cross-origin DevShell auto-auth entry point. The Cactai dashboard mints
// a short-lived signed token; we receive it as ?token=..., verify +
// consume it on the platform side, mint a Supabase magic link for the
// developer's email (creating the auth user with the service-role admin
// API if absent + seeding their app_users / platform_roles rows on
// first sign-in), then redirect to /auth/handoff. That client page
// extracts the session tokens Supabase returns in the URL hash, sets
// the SSR session cookies on this origin, and lands the developer in
// /dev signed in.
//
// SECURITY GATES
//   - Production hard-gate: VERCEL_ENV === 'production' → 404. The
//     /dev surface itself is also production-gated (src/app/dev/
//     layout.tsx), so this route is doubly fail-closed for prod.
//   - Token verification + single-use enforcement live on the PLATFORM
//     side (POST /v1/preview-auth/consume). This route's only secret
//     is HTTPS — it does not hold the signing key.
//
// FAIL CLOSED
//   Any failure (no token, malformed token, platform rejected, missing
//   service-role key) returns 4xx plain text; the user lands on a stub
//   page and can fall through to the normal Supabase login flow.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { endpoints } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PlatformConsumeResponse {
  ok:              boolean;
  project_id?:     string;
  developer_id?:   string;
  developer_email?: string;
  error?:          string;
}

async function consumeTokenOnPlatform(token: string): Promise<PlatformConsumeResponse> {
  const url = `${endpoints.cactaiBase.replace(/\/$/, '')}/v1/preview-auth/consume`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ token }),
    // The platform's consume endpoint is unauthenticated by design — the
    // token IS the credential, and single-use atomic consume on the
    // platform's dashboard_preview_tokens table means a stolen token is
    // burned by the first arrival.
    cache:   'no-store',
  });
  return (await res.json().catch(() => ({}))) as PlatformConsumeResponse;
}

export async function GET(req: Request) {
  // Production hard-gate — the /dev surface this route bridges into is
  // not reachable in production deploys, so neither should this be.
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const url   = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }

  // Verify + single-use consume on the platform side.
  let consumed: PlatformConsumeResponse;
  try {
    consumed = await consumeTokenOnPlatform(token);
  } catch (err) {
    console.error('[preview-auth] platform consume failed:', (err as Error).message);
    return new NextResponse('Auth handoff failed (platform unreachable)', { status: 502 });
  }
  if (!consumed.ok || !consumed.developer_email) {
    return new NextResponse(
      `Auth handoff rejected (${consumed.error ?? 'unknown'})`,
      { status: 401 },
    );
  }

  // Need the service-role key to admin-create the user (if absent) and
  // mint a magic-link action URL that sets Supabase cookies for them.
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.error('[preview-auth] SUPABASE_SERVICE_KEY missing — cannot mint session');
    return new NextResponse('Server misconfigured (no service key)', { status: 500 });
  }

  const admin = createClient(endpoints.supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ensure the auth user exists. createUser is idempotent-ish — it
  // throws "User already registered" when the email is present, which
  // we treat as success. Any other error is fatal.
  let authUserId: string | null = null;
  try {
    const created = await admin.auth.admin.createUser({
      email:         consumed.developer_email,
      email_confirm: true,
    });
    if (created.data?.user?.id) authUserId = created.data.user.id;
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (!/already (registered|exists)/i.test(msg)) {
      console.error('[preview-auth] admin.createUser failed:', msg);
      return new NextResponse('Could not provision auth user', { status: 500 });
    }
  }

  // Resolve the auth user id when createUser didn't return one (e.g. the
  // already-exists path swallowed the error). admin.listUsers paginates;
  // for a brand-new customer Supabase a single page is enough to find
  // the developer by email. Soft-fail: if we can't resolve the id we
  // still mint a magic-link (DevShell sign-in works), but the
  // platform_role grant below is skipped.
  if (!authUserId) {
    try {
      const list = await admin.auth.admin.listUsers({ perPage: 200 });
      const u = list.data?.users?.find((row) => row.email === consumed.developer_email);
      if (u) authUserId = u.id;
    } catch (err) {
      console.warn('[preview-auth] listUsers fallback failed:', (err as Error).message);
    }
  }

  // Grant platform_role='dev' so requireDevRole() at /dev recognises the
  // session, plus an app_users row so any RLS that joins app_users sees
  // them. The platform-side customer-bootstrap intentionally does NOT
  // pre-seed these rows — first sign-in (this path OR the production
  // OAuth callback) is what materialises them.
  //
  // FAIL LOUDLY: if either upsert fails, the developer's session will
  // exist in auth.users but they'll have no platform_roles row, and
  // /dev/layout's requireDevRole -> requireAuth will silently bounce
  // them to /auth/login (because getSessionUser returns null when there
  // are no role / tenant rows, regardless of whether the JWT is valid).
  // Returning a 500 here surfaces the real cause (most often: schema
  // not fully applied, or platform_roles RLS rejecting the service-role
  // write) instead of leaving the developer at a confusing login page.
  if (!authUserId) {
    return new NextResponse(
      'Could not resolve auth user id from createUser or listUsers — cannot grant dev role.',
      { status: 500 },
    );
  }
  try {
    const { error: auError } = await admin
      .from('app_users')
      .upsert(
        { id: authUserId, email: consumed.developer_email },
        { onConflict: 'id' },
      );
    if (auError) {
      console.error('[preview-auth] app_users upsert FAILED:', auError);
      return new NextResponse(
        `Could not seed app_users row for developer (${consumed.developer_email}): ${auError.message}. ` +
        `Check the customer Supabase schema — the app_users table must exist and be writable by the service role.`,
        { status: 500 },
      );
    }

    const { error: prError } = await admin
      .from('platform_roles')
      .upsert(
        { user_id: authUserId, role: 'dev' },
        { onConflict: 'user_id,role' },
      );
    if (prError) {
      console.error('[preview-auth] platform_roles upsert FAILED:', prError);
      return new NextResponse(
        `Could not grant dev role to developer (${consumed.developer_email}): ${prError.message}. ` +
        `Check the customer Supabase schema — the platform_roles table must exist with a unique constraint on (user_id, role) and be writable by the service role.`,
        { status: 500 },
      );
    }
  } catch (err) {
    console.error('[preview-auth] role-grant THREW:', err);
    return new NextResponse(
      `Role grant threw: ${(err as Error).message}`,
      { status: 500 },
    );
  }

  // Mint a magic link with redirect_to pointing at /auth/handoff.
  // admin.generateLink({ type: 'magiclink' }) returns IMPLICIT-flow links:
  // the verify endpoint redirects back to redirect_to with tokens in the
  // URL HASH FRAGMENT (#access_token=...&refresh_token=...). Hash fragments
  // never reach the server, so a route handler can't see them — only
  // client-side JS can. /auth/callback was the wrong target because it
  // only handles ?code= (PKCE flow); it 'callback_failed' on the implicit
  // path, dropping the user on /auth/login with the tokens stranded in
  // the URL.
  //
  // /auth/handoff is a tiny client page that extracts the hash, calls
  // supabase.auth.setSession() (writing cookies to this origin), then
  // hard-redirects to /dev. From there middleware sees the session and
  // the IDE renders.
  const origin     = url.origin;
  const redirectTo = `${origin}/auth/handoff?next=${encodeURIComponent('/dev')}`;
  const linkRes    = await admin.auth.admin.generateLink({
    type:    'magiclink',
    email:   consumed.developer_email,
    options: { redirectTo },
  });
  if (linkRes.error || !linkRes.data?.properties?.action_link) {
    const detail = linkRes.error?.message ?? 'no_action_link_returned';
    const status = linkRes.error?.status ?? 500;
    console.error('[preview-auth] generateLink failed:', detail, 'status:', status);
    // Surface the real error so the developer can act on it. Common cases:
    //   "Database error" — customer Supabase schema missing or auth not enabled
    //   "Invalid email"  — sanity check failed
    //   401/403 from Supabase — service key wrong scope
    //   "Site URL is required" — Supabase Site URL missing in dashboard config
    // Including the underlying message lets the dev fix the root cause
    // instead of guessing.
    return new NextResponse(
      `Could not mint session link: ${detail} (Supabase status ${status}). ` +
      `Check your Supabase project's Auth → URL Configuration: Site URL must be set ` +
      `and the redirect_to URL must be in the allow list. The redirect was: ${redirectTo}`,
      { status: 500 },
    );
  }

  return NextResponse.redirect(linkRes.data.properties.action_link, { status: 302 });
}
