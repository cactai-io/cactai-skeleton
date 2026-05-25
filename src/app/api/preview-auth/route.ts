// src/app/api/preview-auth/route.ts
//
// Cross-origin DevShell auto-auth entry point. The platform's dashboard
// mints a short-lived signed token; we receive it as ?token=..., verify
// + consume it on the platform side, then mint a real Supabase session
// for the matching auth user (creating that user with the service-role
// admin API if absent) and redirect to /dev.
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
//   service-role key) returns 401/404 plain text; the user lands on a
//   stub page and can fall through to the normal Supabase login flow.

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
  try {
    await admin.auth.admin.createUser({
      email:         consumed.developer_email,
      email_confirm: true,
    });
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (!/already (registered|exists)/i.test(msg)) {
      console.error('[preview-auth] admin.createUser failed:', msg);
      return new NextResponse('Could not provision auth user', { status: 500 });
    }
  }

  // Mint a magic link with redirect_to = /dev. The action_link, when
  // followed by the browser, sets Supabase auth cookies on this app's
  // origin and then redirects to /dev. From there requireDevRole() in
  // src/app/dev/layout.tsx finds a valid session and lets the IDE
  // render. This is the standard Supabase pattern for server-initiated
  // sign-in across an origin boundary.
  const origin     = url.origin;
  const redirectTo = `${origin}/dev`;
  const linkRes    = await admin.auth.admin.generateLink({
    type:    'magiclink',
    email:   consumed.developer_email,
    options: { redirectTo },
  });
  if (linkRes.error || !linkRes.data?.properties?.action_link) {
    console.error('[preview-auth] generateLink failed:', linkRes.error?.message);
    return new NextResponse('Could not mint session link', { status: 500 });
  }

  return NextResponse.redirect(linkRes.data.properties.action_link, { status: 302 });
}
