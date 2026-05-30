// src/app/api/auth/set-session/route.ts
//
// Server-side session installer. Receives Supabase access + refresh tokens
// via form-encoded POST (from the /auth/handoff client page), calls
// supabase.auth.setSession() server-side, and lets @supabase/ssr write
// the SSR session cookies via response Set-Cookie headers — then RETURNS
// A 303 REDIRECT to the next path so the browser follows it with the
// cookies attached, atomically.
//
// Why form POST + 303 (not fetch + JSON + window.location.replace):
// the fetch+navigate pattern has a race — the browser stores Set-Cookie
// asynchronously, and window.location.replace can fire before the cookies
// are committed to the jar. The next request lands without a session and
// /dev/layout's requireAuth bounces to /auth/login.
//
// Form POST with a 303 redirect bypasses the race entirely: the browser's
// redirect-follow uses the cookies set on the SAME response, guaranteed
// in order. This is the canonical pattern for OAuth-style cookie handoffs.
//
// Auth: none required. The tokens themselves are the proof of identity;
// invalid tokens fail setSession() and we redirect back to /auth/login
// with an error so the caller can see what went wrong.
//
// Middleware: /api/auth/* is exempt from the preview-bounce in middleware.ts.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { endpoints } from '@/lib/endpoints';

export async function POST(req: Request) {
  // Accept both form-encoded (canonical, used by /auth/handoff's form
  // submit) and JSON (legacy fallback for any caller still posting JSON).
  let access_token  = '';
  let refresh_token = '';
  let next          = '/dev';

  const ctype = req.headers.get('content-type') ?? '';
  if (ctype.includes('application/json')) {
    try {
      const body = await req.json() as { access_token?: string; refresh_token?: string; next?: string };
      access_token  = body.access_token  ?? '';
      refresh_token = body.refresh_token ?? '';
      next          = body.next          ?? '/dev';
    } catch {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_body', req.url), { status: 303 });
    }
  } else {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_body', req.url), { status: 303 });
    }
    access_token  = (form.get('access_token')  as string | null) ?? '';
    refresh_token = (form.get('refresh_token') as string | null) ?? '';
    next          = (form.get('next')          as string | null) ?? '/dev';
  }

  if (!access_token || !refresh_token) {
    return NextResponse.redirect(new URL('/auth/login?error=missing_tokens', req.url), { status: 303 });
  }

  // Constrain `next` to same-origin paths so an attacker can't craft a
  // POST that redirects the user off-site after a successful session
  // install. Only allow paths beginning with a single `/` and no `//`.
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dev';
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
    console.error('[set-session] setSession failed:', error.message);
    return NextResponse.redirect(
      new URL(`/auth/login?error=set_session_failed&detail=${encodeURIComponent(error.message)}`, req.url),
      { status: 303 },
    );
  }

  // 303 so the browser follows with a GET (regardless of the original
  // POST method) — and crucially carries the cookies just set in this
  // response on the very next request.
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}
