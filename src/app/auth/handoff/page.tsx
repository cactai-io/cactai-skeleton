// src/app/auth/handoff/page.tsx
//
// Client-side bridge that completes the DevShell preview-auth handoff
// from Supabase's IMPLICIT flow (admin.generateLink for magiclink). The
// magic-link verify returns to this page with the session tokens in the
// URL hash fragment (#access_token=...&refresh_token=...) — fragments
// never reach the server, so a route handler can't see them. We have
// to read the hash client-side, call supabase.auth.setSession() to
// write the SSR session cookies on this origin, then full-reload to
// /dev so middleware picks up the new cookies.
//
// PKCE flow uses /auth/callback?code=... instead and works server-side.
// Admin-initiated magic links currently come back implicit, so this
// page exists specifically for that path.

'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

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

      // createBrowserClient from @supabase/ssr writes the session via
      // document.cookie, which is what middleware + server routes read.
      // (Plain createClient from @supabase/supabase-js writes localStorage,
      // which the server can't see.)
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setErr(`Could not set session: ${error.message}`);
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
