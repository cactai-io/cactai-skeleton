// src/app/dev/preferences/InvitationsCard.tsx
// Lists outstanding invitations and lets the developer create new ones.
// Backed by /api/invitations (GET, POST, DELETE). The developer holds
// super_admin on the default tenant so they can invite at any role.

'use client';

import { useEffect, useState } from 'react';

type Role = 'super_admin' | 'admin' | 'user';

interface Invitation {
  id:          string;
  email:       string;
  role:        Role;
  expires_at:  string;
  invited_by:  string;
  created_at:  string;
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super admin',
  admin:       'Admin',
  user:        'User',
};

const cardStyle: React.CSSProperties = {
  background:    '#15151F',
  border:        '1px solid #25253A',
  borderRadius:  8,
  padding:       20,
  marginBottom:  20,
};

const inputStyle: React.CSSProperties = {
  padding:      '8px 10px',
  background:   '#0D0D17',
  border:       '1px solid #2A2A40',
  borderRadius: 4,
  color:        '#F5F5FA',
  fontSize:     13,
  flex:         1,
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

const dangerBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  border:     '1px solid #4A2A3A',
  color:      '#E08B9F',
};

export function InvitationsCard() {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [email,       setEmail]       = useState('');
  const [role,        setRole]        = useState<Role>('user');
  const [status,      setStatus]      = useState('');
  const [lastToken,   setLastToken]   = useState<string | null>(null);
  const [busy,        setBusy]        = useState(false);

  const load = async () => {
    setStatus('');
    const res = await fetch('/api/invitations');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus(`Failed to load: ${(err as { error?: string }).error ?? res.status}`);
      setInvitations([]);
      return;
    }
    const data = await res.json() as { invitations: Invitation[] };
    setInvitations(data.invitations);
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!email) { setStatus('Email required'); return; }
    setBusy(true);
    setStatus('Creating…');
    const res = await fetch('/api/invitations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, role }),
    });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus(`Create failed: ${(err as { error?: string }).error ?? res.status}`);
      return;
    }
    const data = await res.json() as { token: string; reused: boolean };
    setLastToken(data.token);
    setEmail('');
    setStatus(data.reused ? 'Existing invitation reused' : 'Invitation created');
    void load();
  };

  const revoke = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus(`Revoke failed: ${(err as { error?: string }).error ?? res.status}`);
      return;
    }
    void load();
  };

  if (!invitations) return <div style={cardStyle}>Loading…</div>;

  const acceptUrl = lastToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/accept-invitation/${lastToken}`
    : null;

  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Invitations</h2>
      <p style={{ fontSize: 12.5, color: '#8B8B9F', marginBottom: 16, lineHeight: 1.5 }}>
        Outstanding invitations to your app. Invitations expire after 7 days. Share the
        invitation link with the recipient — they'll be added to the default tenant on first sign-in.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={inputStyle}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
        <select
          style={{ ...inputStyle, flex: '0 0 140px' }}
          value={role}
          onChange={e => setRole(e.target.value as Role)}
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map(r =>
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          )}
        </select>
        <button style={btnStyle} onClick={create} disabled={busy}>Invite</button>
      </div>

      {acceptUrl && (
        <div style={{
          padding:      10,
          background:   '#0D0D17',
          border:       '1px solid #2A2A40',
          borderRadius: 4,
          marginBottom: 16,
          fontSize:     12,
          fontFamily:   'ui-monospace, monospace',
          wordBreak:    'break-all',
        }}>
          <div style={{ color: '#8B8B9F', marginBottom: 4 }}>Share this link:</div>
          {acceptUrl}
        </div>
      )}

      {status && <p style={{ fontSize: 12, color: '#8B8B9F', marginBottom: 12 }}>{status}</p>}

      {invitations.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8B8B9F' }}>No outstanding invitations.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {invitations.map(inv => (
            <li key={inv.id} style={{
              display:        'flex',
              alignItems:     'center',
              padding:        '10px 0',
              borderTop:      '1px solid #25253A',
              fontSize:       13,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#F5F5FA' }}>{inv.email}</div>
                <div style={{ color: '#8B8B9F', fontSize: 11.5, marginTop: 2 }}>
                  {ROLE_LABELS[inv.role]} • expires {new Date(inv.expires_at).toLocaleDateString()}
                </div>
              </div>
              <button style={dangerBtnStyle} onClick={() => revoke(inv.id)} disabled={busy}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
