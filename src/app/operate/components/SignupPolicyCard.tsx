// src/app/operate/components/SignupPolicyCard.tsx
// Configures the app's signup mode. Reads/writes /api/settings/signup-policy.
//
// The UI is a two-step chooser. First the operator picks "single user" or
// "multi user" — the structural question (do users collaborate?). Then a
// sub-choice clarifies tenant scoping (shared workspace vs isolated, single
// workspace vs multi-workspace). Together these select one of four canonical
// SignupMode values defined in @/lib/signup-mode.
//
// The v1.2.3 footgun (combining open signup with super_admin default role)
// is closed by construction: role assignment is now deterministic from the
// mode, with no separate role dropdown to misconfigure.

'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_SIGNUP_MODE,
  SIGNUP_MODE_DESCRIPTIONS,
  SIGNUP_MODE_LABELS,
  type SignupMode,
} from '@/lib/signup-mode';

type Tier = 'single_user' | 'multi_user';

interface Loaded {
  signup_mode: SignupMode;
}

// Maps the two-tier UI selection back to a single SignupMode value.
function buildMode(tier: Tier, sub: 'shared' | 'isolated' | 'single' | 'multi'): SignupMode {
  if (tier === 'single_user') {
    return sub === 'shared' ? 'single_user_shared' : 'single_user_isolated';
  }
  return sub === 'single' ? 'multi_user_single_workspace' : 'multi_user_multi_workspace';
}

// Inverse — decompose a stored mode into the tier + sub-choice the UI shows.
function splitMode(mode: SignupMode): { tier: Tier; sub: 'shared' | 'isolated' | 'single' | 'multi' } {
  switch (mode) {
    case 'single_user_shared':          return { tier: 'single_user', sub: 'shared'   };
    case 'single_user_isolated':        return { tier: 'single_user', sub: 'isolated' };
    case 'multi_user_single_workspace': return { tier: 'multi_user',  sub: 'single'   };
    case 'multi_user_multi_workspace':  return { tier: 'multi_user',  sub: 'multi'    };
  }
}

const cardStyle: React.CSSProperties = {
  background:    '#15151F',
  border:        '1px solid #25253A',
  borderRadius:  8,
  padding:       20,
  marginBottom:  20,
};

const labelStyle: React.CSSProperties = {
  display:      'block',
  fontSize:     12,
  color:        '#A0A0B8',
  marginBottom: 6,
};

const radioRowStyle: React.CSSProperties = {
  display:      'flex',
  alignItems:   'flex-start',
  gap:          10,
  padding:      '10px 12px',
  borderRadius: 6,
  border:       '1px solid #25253A',
  background:   '#0D0D17',
  marginBottom: 8,
  cursor:       'pointer',
};

const radioRowSelectedStyle: React.CSSProperties = {
  ...radioRowStyle,
  borderColor: '#5B5BE0',
  background:  '#1A1A2A',
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

interface RadioRowProps {
  selected:    boolean;
  onSelect:    () => void;
  title:       string;
  description: string;
}

function RadioRow({ selected, onSelect, title, description }: RadioRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      style={selected ? radioRowSelectedStyle : radioRowStyle}
    >
      <div
        aria-hidden
        style={{
          width:        14,
          height:       14,
          borderRadius: 7,
          border:       `2px solid ${selected ? '#5B5BE0' : '#3A3A55'}`,
          background:   selected ? '#5B5BE0' : 'transparent',
          marginTop:    3,
          flexShrink:   0,
        }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#8B8B9F', marginTop: 2, lineHeight: 1.45 }}>{description}</div>
      </div>
    </div>
  );
}

export function SignupPolicyCard() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [tier,   setTier]   = useState<Tier>('multi_user');
  const [sub,    setSub]    = useState<'shared' | 'isolated' | 'single' | 'multi'>('single');
  const [status, setStatus] = useState('');
  const [busy,   setBusy]   = useState(false);

  const load = async () => {
    setStatus('');
    const res = await fetch('/api/settings/signup-policy');
    if (!res.ok) { setStatus('Failed to load'); return; }
    const data = await res.json() as Loaded;
    setLoaded(data);
    const split = splitMode(data.signup_mode ?? DEFAULT_SIGNUP_MODE);
    setTier(split.tier);
    setSub(split.sub);
  };

  useEffect(() => { void load(); }, []);

  // When tier toggles, reset the sub-choice to the first option for that
  // tier so the UI doesn't carry a sub from the other tier (which would be
  // a non-sequitur, e.g. tier=single_user but sub=multi).
  const onTierChange = (newTier: Tier) => {
    setTier(newTier);
    setSub(newTier === 'single_user' ? 'shared' : 'single');
  };

  const save = async () => {
    setBusy(true);
    setStatus('Saving…');
    const mode = buildMode(tier, sub);
    const res = await fetch('/api/settings/signup-policy', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ signup_mode: mode }),
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
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Signup mode</h2>
      <p style={{ fontSize: 12.5, color: '#8B8B9F', marginBottom: 16, lineHeight: 1.5 }}>
        Controls who can create accounts in your app and how they're organized into workspaces.
      </p>

      <label style={labelStyle}>Is this app used by individuals or by teams?</label>
      <RadioRow
        selected={tier === 'single_user'}
        onSelect={() => onTierChange('single_user')}
        title="Single user"
        description="Each person uses the app on their own. No invitations, no admin roles."
      />
      <RadioRow
        selected={tier === 'multi_user'}
        onSelect={() => onTierChange('multi_user')}
        title="Multi user"
        description="People collaborate in workspaces. The first signup in a workspace becomes its owner; others join by invitation."
      />

      <div style={{ height: 12 }} />

      {tier === 'single_user' ? (
        <>
          <label style={labelStyle}>How is user data isolated?</label>
          <RadioRow
            selected={sub === 'shared'}
            onSelect={() => setSub('shared')}
            title={SIGNUP_MODE_LABELS.single_user_shared}
            description={SIGNUP_MODE_DESCRIPTIONS.single_user_shared}
          />
          <RadioRow
            selected={sub === 'isolated'}
            onSelect={() => setSub('isolated')}
            title={SIGNUP_MODE_LABELS.single_user_isolated}
            description={SIGNUP_MODE_DESCRIPTIONS.single_user_isolated}
          />
        </>
      ) : (
        <>
          <label style={labelStyle}>How many workspaces?</label>
          <RadioRow
            selected={sub === 'single'}
            onSelect={() => setSub('single')}
            title={SIGNUP_MODE_LABELS.multi_user_single_workspace}
            description={SIGNUP_MODE_DESCRIPTIONS.multi_user_single_workspace}
          />
          <RadioRow
            selected={sub === 'multi'}
            onSelect={() => setSub('multi')}
            title={SIGNUP_MODE_LABELS.multi_user_multi_workspace}
            description={SIGNUP_MODE_DESCRIPTIONS.multi_user_multi_workspace}
          />
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button style={btnStyle} onClick={save} disabled={busy}>Save</button>
        {status && <span style={{ fontSize: 12, color: '#8B8B9F' }}>{status}</span>}
      </div>
    </section>
  );
}
