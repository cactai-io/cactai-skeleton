'use client';
// src/app/app/byok-settings/UserModelSelectionPanel.client.tsx
//
// v1.4 — End-user provider+model picker. The deployed app's "AI provider
// keys" page mounts this so the user can:
//   - pick their own provider+model for chat and gen capabilities
//   - paste a BYOK API key per provider (saved to user_api_keys)
//
// Persistence:
//   - selections → /api/byok/user-model-selections (user slice of
//     decisions.model_selections_v1)
//   - keys      → /api/byok/user-keys (one row per user×provider in
//     user_api_keys, encrypted with SECRETS_ENCRYPTION_KEY)
//
// This is the user-owner mirror of the dashboard's ProviderModelPanel.
// We keep a self-contained copy here (rather than importing from
// @cactai-io/mui) so the deployed app has zero coupling to the platform
// package version once shipped — the dev's keys-architecture choices are
// frozen at deploy time and don't move with platform releases.

import React, { useEffect, useState } from 'react';

type Capability = 'chat' | 'gen';

interface Pick {
  provider_id: string | null;
  selection:   string | null;
}

interface UserSlice {
  routing?:   Record<string, string>;
  providers?: Record<string, { selection?: string }>;
}

const PROVIDER_OPTIONS: Record<Capability, Array<{ id: string; label: string }>> = {
  chat: [
    { id: 'ai.anthropic', label: 'Anthropic' },
    { id: 'ai.openai',    label: 'OpenAI' },
  ],
  gen: [
    { id: 'ai.openai',       label: 'OpenAI (gpt-image)' },
    { id: 'media.replicate', label: 'Replicate' },
  ],
};

const SELECTIONS: Record<string, Array<{ id: string; label: string }>> = {
  'ai.anthropic': [
    { id: 'claude-haiku-4-5',  label: 'Haiku — fastest' },
    { id: 'claude-sonnet-4-6', label: 'Sonnet — balanced' },
    { id: 'claude-opus-4-7',   label: 'Opus — highest reasoning' },
  ],
  'ai.openai': [
    { id: 'gpt-5-nano', label: 'GPT-5 nano — fastest' },
    { id: 'gpt-5-mini', label: 'GPT-5 mini — balanced' },
    { id: 'gpt-5',      label: 'GPT-5 — highest reasoning' },
  ],
  'media.replicate': [
    { id: 'flux-schnell', label: 'FLUX Schnell — fastest' },
    { id: 'flux-pro',     label: 'FLUX Pro — best quality' },
  ],
};

function sliceToPicks(slice: UserSlice): Record<Capability, Pick> {
  const out: Record<Capability, Pick> = {
    chat: { provider_id: null, selection: null },
    gen:  { provider_id: null, selection: null },
  };
  const routing   = slice.routing   ?? {};
  const providers = slice.providers ?? {};
  for (const cap of ['chat', 'gen'] as Capability[]) {
    const pid = routing[cap];
    if (!pid) continue;
    out[cap].provider_id = pid;
    out[cap].selection   = providers[pid]?.selection ?? null;
  }
  return out;
}

function picksToSlice(picks: Record<Capability, Pick>): UserSlice {
  const routing:   Record<string, string>                  = {};
  const providers: Record<string, { selection?: string }> = {};
  for (const cap of ['chat', 'gen'] as Capability[]) {
    const p = picks[cap];
    if (!p.provider_id) continue;
    routing[cap] = p.provider_id;
    if (p.selection) {
      providers[p.provider_id] = { selection: p.selection };
    }
  }
  return { routing, providers };
}

export function UserModelSelectionPanel(): React.ReactElement {
  const [picks, setPicks] = useState<Record<Capability, Pick>>({
    chat: { provider_id: null, selection: null },
    gen:  { provider_id: null, selection: null },
  });
  const [keys, setKeys]   = useState<Record<string, { configured: boolean; draft: string }>>({});
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [selRes, keyRes] = await Promise.all([
          fetch('/api/byok/user-model-selections'),
          fetch('/api/byok/user-keys'),
        ]);
        if (selRes.ok) {
          const body = await selRes.json() as { slice?: UserSlice };
          setPicks(sliceToPicks(body.slice ?? {}));
        }
        if (keyRes.ok) {
          const body = await keyRes.json() as { providers: Array<{ provider_id: string }> };
          const next: Record<string, { configured: boolean; draft: string }> = {};
          for (const row of body.providers) {
            next[row.provider_id] = { configured: true, draft: '' };
          }
          setKeys(next);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, []);

  const setPick = (cap: Capability, patch: Partial<Pick>): void => {
    setPicks(prev => {
      const cur = prev[cap];
      const next: Pick = patch.provider_id !== undefined && patch.provider_id !== cur.provider_id
        ? { provider_id: patch.provider_id ?? null, selection: null }
        : { ...cur, ...patch };
      const after = { ...prev, [cap]: next };
      void saveSelections(after);
      return after;
    });
  };

  const saveSelections = async (next: Record<Capability, Pick>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/byok/user-model-selections', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slice: picksToSlice(next) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        setError(body.detail ?? `Save failed (${res.status})`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setKeyDraft = (providerId: string, draft: string): void => {
    setKeys(prev => ({
      ...prev,
      [providerId]: { configured: prev[providerId]?.configured ?? false, draft },
    }));
  };

  const commitKey = async (providerId: string): Promise<void> => {
    const draft = keys[providerId]?.draft ?? '';
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/byok/user-keys', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ set_provider: { id: providerId, value: draft } }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        setError(body.detail ?? `Save failed (${res.status})`);
        return;
      }
      setKeys(prev => ({
        ...prev,
        [providerId]: { configured: true, draft: '' },
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeKey = async (providerId: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/byok/user-keys', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ set_provider: { id: providerId, value: '' } }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        setError(body.detail ?? `Remove failed (${res.status})`);
        return;
      }
      setKeys(prev => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renderRow = (cap: Capability): React.ReactElement => {
    const pick    = picks[cap];
    const opts    = PROVIDER_OPTIONS[cap];
    const selOpts = pick.provider_id ? SELECTIONS[pick.provider_id] ?? [] : [];
    const keyRow  = pick.provider_id ? keys[pick.provider_id] : undefined;
    return (
      <div key={cap} style={{
        background: '#13131F', border: '1px solid #25253A', borderRadius: 8,
        padding: '14px 16px', marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {cap === 'chat' ? 'Chat' : 'Generative (image, audio, etc.)'}
        </div>
        <div style={{ fontSize: 11, color: '#8B8B9F', marginBottom: 10, lineHeight: 1.45 }}>
          {cap === 'chat'
            ? 'Powers the chat surface in this app.'
            : 'Default for every generative call unless this app overrides per-capability.'}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#B6B6CC' }}>Provider</span>
          <select
            value={pick.provider_id ?? ''}
            onChange={e => setPick(cap, { provider_id: e.target.value || null })}
            style={{
              padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit',
              background: '#1B1B2A', color: '#E6E6F5',
              border: '1px solid #2A2A40', borderRadius: 6,
            }}
          >
            <option value="">— Use the app default —</option>
            {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>

        {pick.provider_id && selOpts.length > 0 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: '#B6B6CC' }}>Model</span>
            <select
              value={pick.selection ?? ''}
              onChange={e => setPick(cap, { selection: e.target.value || null })}
              style={{
                padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit',
                background: '#1B1B2A', color: '#E6E6F5',
                border: '1px solid #2A2A40', borderRadius: 6,
              }}
            >
              <option value="">— Pick a model —</option>
              {selOpts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        )}

        {pick.provider_id && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: '#B6B6CC', marginBottom: 4 }}>Your API key (BYOK)</div>
            {keyRow?.configured ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#9AE0C1' }}>Configured</span>
                <button
                  type="button"
                  onClick={() => void removeKey(pick.provider_id!)}
                  disabled={busy}
                  style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4,
                    background: 'transparent', border: '1px solid #2A2A40',
                    color: '#8B8B9F', cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="password"
                  value={keyRow?.draft ?? ''}
                  onChange={e => setKeyDraft(pick.provider_id!, e.target.value)}
                  placeholder="Paste your API key"
                  style={{
                    flex: 1, padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit',
                    background: '#1B1B2A', color: '#E6E6F5',
                    border: '1px solid #2A2A40', borderRadius: 6,
                  }}
                />
                <button
                  type="button"
                  onClick={() => void commitKey(pick.provider_id!)}
                  disabled={busy || !(keyRow?.draft ?? '').trim()}
                  style={{
                    fontSize: 12, padding: '6px 12px', borderRadius: 6,
                    background: '#00D68F', border: 'none', color: '#0B0B12',
                    fontWeight: 600,
                    cursor: busy ? 'wait' : (keyRow?.draft ?? '').trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Your AI providers</h2>
      {renderRow('chat')}
      {renderRow('gen')}
      {error && (
        <div style={{ fontSize: 12, color: '#FF6B6B', marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
