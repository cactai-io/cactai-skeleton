// src/app/app/byok-settings/BudgetPanel.client.tsx
//
// End-user per-provider monthly spend caps on their OWN BYOK keys.
// Backed by /api/byok/budgets (GET/PUT/DELETE). Units are provider-native
// (tokens/credits/dollars) per the keys-budgets-team policy — the end
// user enters whatever their provider bills in. The developer doesn't set
// or see these; it's the end user's key and money.

'use client';

import { useEffect, useState } from 'react';

interface BudgetEntry {
  limit_units:     number;
  alert_at_units?: number;
  last_reset_at?:  string;
}

// The BYOK providers an end user can cap. Matches the providers the app's
// BYOK key model supports.
const PROVIDERS: Array<{ id: string; label: string; unit: string }> = [
  { id: 'ai.anthropic', label: 'Anthropic', unit: 'tokens' },
  { id: 'ai.openai',    label: 'OpenAI',    unit: 'tokens' },
];

export function BudgetPanel() {
  const [budgets, setBudgets] = useState<Record<string, BudgetEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/byok/budgets');
        if (!res.ok || cancelled) return;
        const data = await res.json() as { budgets?: Record<string, BudgetEntry> };
        if (!cancelled) setBudgets(data.budgets ?? {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        Monthly spend caps
      </h2>
      <p style={{ color: '#8B8B9F', fontSize: 13, marginBottom: 16 }}>
        Set an optional monthly cap on each of your own provider keys. When
        usage reaches the cap, the app stops using that key for the rest of
        the month and falls back to the developer&apos;s configured provider.
        An optional alert threshold notifies you before you hit the cap.
        Limits reset at the start of each calendar month.
      </p>
      {loading ? (
        <div style={{ color: '#8B8B9F', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROVIDERS.map(p => (
            <BudgetRow
              key={p.id}
              provider={p}
              entry={budgets[p.id]}
              onSaved={(entry) => setBudgets(prev => ({ ...prev, [p.id]: entry }))}
              onRemoved={() => setBudgets(prev => {
                const next = { ...prev };
                delete next[p.id];
                return next;
              })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetRow({
  provider, entry, onSaved, onRemoved,
}: {
  provider: { id: string; label: string; unit: string };
  entry?:   BudgetEntry;
  onSaved:  (entry: BudgetEntry) => void;
  onRemoved: () => void;
}) {
  const [limit, setLimit]   = useState(entry?.limit_units != null ? String(entry.limit_units) : '');
  const [alert, setAlert]   = useState(entry?.alert_at_units != null ? String(entry.alert_at_units) : '');
  const [busy,  setBusy]    = useState(false);

  // Re-sync when the loaded entry arrives after first render.
  useEffect(() => {
    setLimit(entry?.limit_units != null ? String(entry.limit_units) : '');
    setAlert(entry?.alert_at_units != null ? String(entry.alert_at_units) : '');
  }, [entry?.limit_units, entry?.alert_at_units]);

  async function save() {
    const limitNum = Number(limit);
    if (!Number.isFinite(limitNum) || limitNum < 0) return;
    const alertNum = alert.trim() === '' ? undefined : Number(alert);
    setBusy(true);
    try {
      const res = await fetch('/api/byok/budgets', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          provider_id:    provider.id,
          limit_units:    limitNum,
          alert_at_units: alertNum,
        }),
      });
      if (res.ok) {
        onSaved({ limit_units: limitNum, alert_at_units: alertNum, last_reset_at: new Date().toISOString() });
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch('/api/byok/budgets', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ provider_id: provider.id }),
      });
      if (res.ok) {
        setLimit('');
        setAlert('');
        onRemoved();
      }
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: 120,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '6px 10px',
    color: '#E8E8F0',
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap',
      padding: 14,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
    }}>
      <div style={{ minWidth: 90, fontSize: 14, fontWeight: 500, alignSelf: 'center' }}>
        {provider.label}
      </div>
      <label style={{ fontSize: 11, color: '#8B8B9F', display: 'flex', flexDirection: 'column', gap: 4 }}>
        Monthly cap ({provider.unit})
        <input
          type="number"
          min={0}
          value={limit}
          onChange={e => setLimit(e.target.value)}
          placeholder="No cap"
          style={inputStyle}
        />
      </label>
      <label style={{ fontSize: 11, color: '#8B8B9F', display: 'flex', flexDirection: 'column', gap: 4 }}>
        Alert at ({provider.unit})
        <input
          type="number"
          min={0}
          value={alert}
          onChange={e => setAlert(e.target.value)}
          placeholder="Optional"
          style={inputStyle}
        />
      </label>
      <button
        onClick={() => void save()}
        disabled={busy || limit.trim() === ''}
        style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 600,
          background: busy || limit.trim() === '' ? 'rgba(255,255,255,0.08)' : '#5856E5',
          color: busy || limit.trim() === '' ? '#8B8B9F' : '#fff',
          border: 'none', borderRadius: 6,
          cursor: busy || limit.trim() === '' ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? '…' : 'Save'}
      </button>
      {entry && (
        <button
          onClick={() => void remove()}
          disabled={busy}
          style={{
            padding: '7px 12px', fontSize: 13,
            background: 'transparent', color: '#E36464',
            border: '1px solid rgba(227,100,100,0.4)', borderRadius: 6,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
