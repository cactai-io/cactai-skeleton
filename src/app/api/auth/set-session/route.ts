// src/app/api/auth/set-session/route.ts
//
// Server-side session installer. Receives Supabase access + refresh tokens
// from the client (extracted from the implicit-flow magic-link hash fragment),
// calls supabase.auth.setSession(), and lets @supabase/ssr write the SSR
// session cookies via response Set-Cookie headers.
//
// Why this exists: doing setSession() purely client-side (via createBrowserClient
// + document.cookie writes) is racy. The cookie write is asynchronous, and
// window.location.replace() can fire before the cookies are committed,
// causing the next request's server-side middleware to see no session and
// bounce the user to /auth/login. Routing the tokens through this server
// endpoint guarantees the cookies are set via response headers — the browser
// stores them before the response completes, so the subsequent navigation
// is guaranteed to carry an authenticated session.
//
// Auth: none required. The tokens themselves are the proof of identity;
// invalid tokens fail setSession() and we return 400.
//
// Middleware: /api/auth/* is exempt from the preview-bounce in middleware.ts.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { endpoints } from '@/lib/endpoints';

export async function POST(req: Request) {
  let body: { access_token?: string; refresh_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { access_token, refresh_token } = body;
  if (typeof access_token !== 'string' || typeof refresh_token !== 'string'
      || !access_token || !refresh_token) {
    return NextResponse.json({ error: 'missing_tokens' }, { status: 400 });
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

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return NextResponse.json({ error: 'setSession_failed', detail: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
