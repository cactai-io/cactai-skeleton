// src/app/auth/handoff/page.tsx
//
// Client-side bridge that completes the DevShell preview-auth handoff
// from Supabase's IMPLICIT flow (admin.generateLink for magiclink). The
// magic-link verify returns to this page with the session tokens in the
// URL hash fragment (#access_token=...&refresh_token=...) — fragments
// never reach the server, so a route handler can't see them. We read
// the hash client-side, then submit a hidden HTML form that POSTs the
// tokens to /api/auth/set-session.
//
// Why a form submit (not fetch + window.location.replace): the form's
// POST → 303 redirect chain is atomic — the browser stores the cookies
// from the response's Set-Cookie headers AND follows the 303 to the
// next URL on the same response cycle, with the cookies attached. A
// fetch + window.location.replace pattern races: fetch resolves before
// the browser has committed Set-Cookie to the jar, so the next request
// (from replace) can land without a session.

'use client';

import { useEffect, useRef, useState } from 'react';

export default function PreviewAuthHandoff() {
  const [err, setErr]   = useState<string | null>(null);
  const formRef         = useRef<HTMLFormElement>(null);
  const accessRef       = useRef<HTMLInputElement>(null);
  const refreshRef      = useRef<HTMLInputElement>(null);
  const nextRef         = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hash = typeof window !== 'undefined' && window.location.hash.startsWith('#')
      ? window.location.hash.slice(1) : '';
    const hashParams    = new URLSearchParams(hash);
    const access_token  = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    if (!access_token || !refresh_token) {
      setErr('No session tokens in URL — magic link may have expired or been malformed.');
      return;
    }

    const qs   = new URLSearchParams(window.location.search);
    const next = qs.get('next') || '/dev';

    if (accessRef.current)  accessRef.current.value  = access_token;
    if (refreshRef.current) refreshRef.current.value = refresh_token;
    if (nextRef.current)    nextRef.current.value    = next;

    // Auto-submit the hidden form. The server's 303 response navigates
    // the top-level frame to `next`, carrying the cookies set on the
    // same response.
    formRef.current?.submit();
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
      <form
        ref={formRef}
        action="/api/auth/set-session"
        method="POST"
        encType="application/x-www-form-urlencoded"
        style={{ display: 'none' }}
      >
        <input ref={accessRef}  type="hidden" name="access_token"  />
        <input ref={refreshRef} type="hidden" name="refresh_token" />
        <input ref={nextRef}    type="hidden" name="next"          />
      </form>
    </div>
  );
}
