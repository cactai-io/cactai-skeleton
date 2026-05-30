// src/app/auth/handoff/page.tsx
//
// Client-side bridge that completes the DevShell preview-auth handoff
// from Supabase's IMPLICIT flow (admin.generateLink for magiclink). The
// magic-link verify returns to this page with the session tokens in the
// URL hash fragment (#access_token=...&refresh_token=...) — fragments
// never reach the server, so a route handler can't see them. We read
// the hash client-side, POST the tokens to /api/auth/set-session (which
// installs them via Set-Cookie response headers, NOT document.cookie),
// then full-reload to /dev so middleware picks up the new cookies.
//
// Why route through the server: doing setSession() purely on the client
// via createBrowserClient writes cookies via document.cookie, which is
// asynchronous — window.location.replace() can fire before the cookies
// commit, the next request sees no session, and the user gets bounced
// to /auth/login. Routing through the server endpoint guarantees the
// Set-Cookie headers are processed by the browser before the response
// completes, so the subsequent navigation carries an authenticated
// session reliably.
//
// PKCE flow uses /auth/callback?code=... instead and works server-side.
// Admin-initiated magic links currently come back implicit, so this
// page exists specifically for that path.

'use client';

import { useEffect, useState } from 'react';

export default function PreviewAuthHandoff() {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Tokens arrive in window.location.hash (#access_token=...&refresh_token=...&type=magiclink&...).
      const hash = typeof window !== 'undefined' && window.location.hash.startsWith('#')
        ? window.location.hash.slice(1) : '';
      const hashParams = new URLSearchParams(hash);
      const access_token  = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      if (!access_token || !refresh_token) {
        setErr('No session tokens in URL — magic link may have expired or been malformed.');
        return;
      }

      // Server-side cookie install. The route uses createServerClient +
      // cookies() from next/headers to write Set-Cookie headers; the
      // browser commits them before this fetch resolves.
      const res = await fetch('/api/auth/set-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ access_token, refresh_token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: `status_${res.status}` })) as { detail?: string; error?: string };
        setErr(`Could not set session: ${body.detail ?? body.error ?? `HTTP ${res.status}`}`);
        return;
      }

      // Where to send the user after sign-in. Defaults to /dev for the
      // preview-auth flow but accepts ?next= so other handoffs can reuse
      // this page.
      const qs   = new URLSearchParams(window.location.search);
      const next = qs.get('next') || '/dev';

      // Full reload (NOT a router.push) so the next request carries the
      // freshly-written Supabase cookies and middleware sees an
      // authenticated session.
      window.location.replace(next);
    })();
  }, []);

  if (err) {
    return (
      <div style={{
        padding: 40, maxWidth: 480, margin: '60px auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#333', lineHeight: 1.5,
      }}>
        <h2 style={{ marginTop: 0 }}>Sign-in failed</h2>
        <p>{err}</p>
        <p style={{ fontSize: 13, color: '#888' }}>
          Try opening DevShell again from the Cactai dashboard.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: 40, fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#888', textAlign: 'center',
    }}>
      Signing you in…
    </div>
  );
}
