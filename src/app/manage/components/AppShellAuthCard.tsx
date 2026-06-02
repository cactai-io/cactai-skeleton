// src/app/dev/preferences/AppShellAuthCard.tsx
// Client-side card to view and edit AppShell OAuth credentials. Reads from
// GET /api/settings/appshell-auth (which proxies to the platform), shows
// masked secret tails for already-configured providers, and lets the
// developer enable / disable / re-key Google sign-in.
//
// Apple OAuth support was removed 2026-05-28. To re-enable later, restore
// from git history — both this file and the platform's appshell-oauth.ts
// route schema need to come back together.

'use client';

import { useEffect, useState } from 'react';

interface GoogleState {
  client_id?:            string;
  client_secret_masked?: string;
  configured?:           boolean;
}

interface Loaded {
  google_oauth: GoogleState | null;
}

const cardStyle: React.CSSProperties = {
  background:    '#15151F',
  border:        '1px solid #25253A',
  borderRadius:  8,
  padding:       20,
  marginBottom:  20,
};

const labelStyle: React.CSSProperties = {
  display:    'block',
  fontSize:   12,
  color:      '#A0A0B8',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '8px 10px',
  background:   '#0D0D17',
  border:       '1px solid #2A2A40',
  borderRadius: 4,
  color:        '#F5F5FA',
  fontSize:     13,
  fontFamily:   'ui-monospace, monospace',
};

const btnStyle: React.CSSProperties = {
  padding:      '8px 14px',
  background:   '#5B5BE0',
  color:        '#fff',
  border:       'none',
  borderRadius: 4,
  fontSize:     13,
  cursor:       'pointer',
};

const subBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  border:     '1px solid #2A2A40',
  color:      '#A0A0B8',
};

export function AppShellAuthCard() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy]     = useState(false);

  // Google form state
  const [googleEnabled,  setGoogleEnabled]  = useState(false);
  const [googleId,       setGoogleId]       = useState('');
  const [googleSecret,   setGoogleSecret]   = useState('');

  const load = async () => {
    setStatus('');
    const res = await fetch('/api/settings/appshell-auth');
    if (!res.ok) { setStatus('Failed to load'); return; }
    const data = await res.json() as Loaded;
    setLoaded(data);
    setGoogleEnabled(!!data.google_oauth?.configured);
    setGoogleId(data.google_oauth?.client_id ?? '');
    setGoogleSecret('');
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setBusy(true);
    setStatus('Saving…');
    const body: Record<string, unknown> = {};
    body.google_oauth = googleEnabled
      ? {
          client_id:     googleId,
          // Send the new secret only if the user typed one. Omit otherwise
          // so the server retains the previous value.
          ...(googleSecret ? { client_secret: googleSecret } : {}),
        }
      : null;

    const res = await fetch('/api/settings/appshell-auth', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus(`Save failed: ${(err as { error?: string }).error ?? res.status}`);
      return;
    }
    setStatus('Saved');
    void load();
  };

  if (!loaded) return <div style={cardStyle}>Loading…</div>;

  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Sign-in providers</h2>
      <p style={{ fontSize: 12.5, color: '#8B8B9F', marginBottom: 16, lineHeight: 1.5 }}>
        Email and password is enabled by default. Optionally enable Google sign-in.
        Secrets are stored encrypted; the masked tail confirms a secret is configured.
      </p>

      <div style={{ borderTop: '1px solid #25253A', paddingTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={googleEnabled} onChange={e => setGoogleEnabled(e.target.checked)} />
          <strong style={{ fontSize: 13 }}>Google</strong>
        </label>
        {googleEnabled && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Client ID</label>
            <input style={inputStyle} value={googleId} onChange={e => setGoogleId(e.target.value)} placeholder="xxx.apps.googleusercontent.com" />
            <div style={{ height: 10 }} />
            <label style={labelStyle}>
              Client secret {loaded.google_oauth?.client_secret_masked && `(current: ${loaded.google_oauth.client_secret_masked} — leave blank to keep)`}
            </label>
            <input style={inputStyle} type="password" value={googleSecret} onChange={e => setGoogleSecret(e.target.value)} placeholder="GOCSPX-…" />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button style={btnStyle} onClick={save} disabled={busy}>Save</button>
        <button style={subBtnStyle} onClick={() => void load()} disabled={busy}>Reset</button>
        {status && <span style={{ fontSize: 12, color: '#8B8B9F' }}>{status}</span>}
      </div>
    </section>
  );
}
