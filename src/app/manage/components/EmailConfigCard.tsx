// src/app/manage/components/EmailConfigCard.tsx
// Management-panel UI for the invitation-email provider selection. Reads/
// writes project_state.decisions.invitation_email_v1 via the
// /api/manage/email-config endpoint (server route below).
//
// Provider options:
//   - 'supabase' — use Supabase Auth's built-in invitation email. No
//     credentials needed; the developer can customize the template in
//     their Supabase Studio (Auth → Email Templates → Invite User).
//   - 'resend'   — Resend with the developer's own API key + from-address.
//     Higher branding/deliverability ceiling. Optional HTML/text template
//     overrides; defaults to a built-in template otherwise.
//   - 'none'     — no automatic email. Invitation creates a share link only.
//
// A "Send test" button uses Api.sendTestInvitation to verify the config
// before the developer relies on it for real users.

'use client';

import React, { useEffect, useState } from 'react';
import { lensFetch } from '@/lib/lens-tab';
import type { JSX } from 'react';

type Provider = 'supabase' | 'resend' | 'none';

interface Config {
  provider:        Provider;
  resend_api_key?: string;
  email_from?:    string;
  template_html?: string;
  template_text?: string;
}

const PROVIDER_BLURBS: Record<Provider, string> = {
  supabase: 'Uses your Supabase project\'s built-in invitation email. Customize the template in Supabase Studio → Auth → Email Templates → Invite User. No credentials needed here.',
  resend:   'Uses Resend with your own API key and from-address. Higher branding and deliverability — you own the sender reputation.',
  none:     'No automatic email. Invitations create a shareable link you forward manually.',
};

export function EmailConfigCard(): JSX.Element {
  const [cfg, setCfg]         = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testBusy, setTestBusy]   = useState(false);
  const [testMsg, setTestMsg]     = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await lensFetch('/api/manage/email-config');
        if (!res.ok) throw new Error(`status_${res.status}`);
        const data = await res.json() as { config: Config };
        setCfg(data.config);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await lensFetch('/api/manage/email-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(cfg),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? `status_${res.status}`);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) return;
    setTestBusy(true);
    setTestMsg(null);
    try {
      const res = await lensFetch('/api/manage/email-config/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: testEmail }),
      });
      const body = await res.json().catch(() => ({})) as { ok?: boolean; detail?: string };
      if (!res.ok) throw new Error(body.detail ?? `status_${res.status}`);
      setTestMsg('Test email sent. Check the recipient inbox.');
    } catch (e) {
      setTestMsg(`Test failed: ${(e as Error).message}`);
    } finally {
      setTestBusy(false);
    }
  };

  if (loading || !cfg) {
    return <div style={cardStyle}><p style={mutedStyle}>Loading…</p></div>;
  }

  return (
    <div style={cardStyle}>
      <h2 style={cardTitle}>Email delivery</h2>
      <p style={mutedStyle}>
        Choose how invitation emails get sent to new users.
      </p>

      <div style={{ marginTop: 16 }}>
        {(['supabase', 'resend', 'none'] as Provider[]).map(p => (
          <label key={p} style={{ display: 'block', marginBottom: 10, cursor: 'pointer' }}>
            <input
              type="radio"
              name="provider"
              value={p}
              checked={cfg.provider === p}
              onChange={() => setCfg({ ...cfg, provider: p })}
              style={{ marginRight: 8 }}
            />
            <strong style={{ color: 'var(--c-text)' }}>
              {p === 'supabase' ? 'Supabase Auth invitations' : p === 'resend' ? 'Resend (custom branding)' : 'Skip — share link only'}
            </strong>
            <div style={{ ...mutedStyle, marginLeft: 24, marginTop: 2 }}>{PROVIDER_BLURBS[p]}</div>
          </label>
        ))}
      </div>

      {cfg.provider === 'resend' && (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--c-surface-2)', borderRadius: 'var(--r)' }}>
          <label style={labelStyle}>
            Resend API key
            <input
              type="password"
              value={cfg.resend_api_key ?? ''}
              onChange={e => setCfg({ ...cfg, resend_api_key: e.target.value })}
              placeholder="re_..."
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            From address
            <input
              type="text"
              value={cfg.email_from ?? ''}
              onChange={e => setCfg({ ...cfg, email_from: e.target.value })}
              placeholder='"My App <noreply@myapp.com>"'
              style={inputStyle}
            />
          </label>
          <p style={{ ...mutedStyle, marginTop: 8 }}>
            The from-address domain must be verified in your Resend account.
            Template HTML and text use a built-in default unless you customize
            them in your workflow agent's chat — ask it to design an
            invitation email.
          </p>
        </div>
      )}

      {err && <div style={{ color: 'var(--c-danger)', fontSize: 12, marginTop: 12 }}>{err}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          onClick={save}
          disabled={saving}
          style={btnPrimary}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {cfg.provider !== 'none' && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
          <h3 style={{ ...cardTitle, fontSize: 14 }}>Send test invitation</h3>
          <p style={mutedStyle}>
            Sends a test email to verify the configuration works end-to-end.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
            />
            <button onClick={sendTest} disabled={testBusy || !testEmail} style={btnGhost}>
              {testBusy ? 'Sending…' : 'Send test'}
            </button>
          </div>
          {testMsg && <div style={{ ...mutedStyle, marginTop: 8 }}>{testMsg}</div>}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background:    'var(--c-surface)',
  border:        '1px solid var(--c-border)',
  borderRadius:  'var(--r)',
  padding:       20,
  marginBottom:  20,
};
const cardTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)',
};
const mutedStyle: React.CSSProperties = {
  color: 'var(--c-text-2)', fontSize: 13, lineHeight: 1.5, margin: 0,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: 'var(--c-text-2)', marginTop: 12,
};
const inputStyle: React.CSSProperties = {
  display:        'block',
  width:          '100%',
  marginTop:      4,
  padding:        '8px 12px',
  background:     'var(--c-bg)',
  border:         '1px solid var(--c-border)',
  borderRadius:   'var(--r)',
  color:          'var(--c-text)',
  fontFamily:     'var(--f-ui)',
  fontSize:       13,
};
const btnPrimary: React.CSSProperties = {
  padding:        '8px 16px',
  borderRadius:   'var(--r)',
  border:         '1px solid var(--c-accent)',
  background:     'var(--c-accent)',
  color:          'white',
  fontFamily:     'var(--f-ui)',
  fontSize:       13,
  cursor:         'pointer',
};
const btnGhost: React.CSSProperties = {
  padding:        '8px 16px',
  borderRadius:   'var(--r)',
  border:         '1px solid var(--c-border)',
  background:     'transparent',
  color:          'var(--c-text)',
  fontFamily:     'var(--f-ui)',
  fontSize:       13,
  cursor:         'pointer',
};
