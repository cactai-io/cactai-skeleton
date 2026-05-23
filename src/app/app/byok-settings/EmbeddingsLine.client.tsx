// src/app/app/byok-settings/EmbeddingsLine.client.tsx
//
// v1.3.5 Build 6 — End-user embeddings settings line.
//
// Two-tier visibility (Build 6 fix):
//   - The "Memory" header + on/off toggle + locked Provider/Model
//     descriptors render for EVERY end user, regardless of whether the
//     deployed app is in BYOK mode or developer-paid mode. A
//     developer-paid app's end user still needs the affordance to turn
//     off "remember details" — that's a privacy / personal-preference
//     setting independent of who pays for the API calls.
//   - The OpenAI key-input field is GATED to BYOK mode. In developer-
//     paid mode the end user does not supply a key (the developer's
//     project-level OpenAI key handles embedding), so the input would
//     be confusing / actively wrong to surface.
//
// BYOK mode comes from the project-level toggle at /api/settings/byok
// (the developer flips it in Project Settings → Configuration). When
// the GET returns `{ enabled: true }` we render the key input;
// otherwise we render a small "memory runs on the developer's OpenAI
// key — toggle above to opt out" hint.
//
// The provider and model are LOCKED (OpenAI · text-embedding-3-small)
// because vectors from different embedding models are not comparable —
// changing them would erase what the app has remembered.

'use client';

import React, { useEffect, useState } from 'react';
import type { JSX } from 'react';

interface State {
  loading:     boolean;
  enabled:     boolean;
  has_key:     boolean;
  key_masked:  string | null;
  /** Project-level BYOK toggle. When false, the end user does not
   *  supply a key — hide the input field. */
  byokMode:    boolean;
  error:       string | null;
  /** Raw key the user is typing — masked once saved. */
  keyInput:    string;
  /** Save-in-progress flag for either field. */
  saving:      boolean;
}

export function EmbeddingsLine(): JSX.Element {
  const [s, setS] = useState<State>({
    loading: true, enabled: true, has_key: false, key_masked: null,
    byokMode: false, error: null, keyInput: '', saving: false,
  });

  useEffect(() => { void load(); }, []);

  async function load(): Promise<void> {
    try {
      // Fan-out fetches: per-user embeddings settings AND the project-level
      // BYOK toggle. BYOK errors are non-fatal — fall back to "not BYOK".
      const [embedRes, byokRes] = await Promise.all([
        fetch('/api/settings/embeddings', { cache: 'no-store' }),
        fetch('/api/settings/byok',        { cache: 'no-store' }).catch(() => null),
      ]);
      const data = await embedRes.json() as {
        enabled?: boolean; has_key?: boolean; key_masked?: string | null;
      };
      let byokMode = false;
      if (byokRes && byokRes.ok) {
        const byokData = await byokRes.json().catch(() => null) as { enabled?: boolean } | null;
        byokMode = byokData?.enabled === true;
      }
      setS(prev => ({
        ...prev,
        loading:    false,
        enabled:    data.enabled ?? true,
        has_key:    data.has_key ?? false,
        key_masked: data.key_masked ?? null,
        byokMode,
        error:      null,
      }));
    } catch (err) {
      setS(prev => ({ ...prev, loading: false, error: (err as Error).message }));
    }
  }

  async function patch(body: { enabled?: boolean; openai_api_key?: string }): Promise<void> {
    setS(prev => ({ ...prev, saving: true, error: null }));
    try {
      const res = await fetch('/api/settings/embeddings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as {
        enabled?: boolean; has_key?: boolean; key_masked?: string | null;
      };
      setS(prev => ({
        ...prev,
        saving:     false,
        enabled:    data.enabled ?? prev.enabled,
        has_key:    data.has_key ?? false,
        key_masked: data.key_masked ?? null,
        keyInput:   '',
      }));
    } catch (err) {
      setS(prev => ({ ...prev, saving: false, error: (err as Error).message }));
    }
  }

  return (
    <div style={{
      background: '#13131F', border: '1px solid #1E1E2E', borderRadius: 12,
      padding: 20, marginTop: 24,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 500, color: '#F5F5FA', margin: 0, marginBottom: 8 }}>
        Memory
      </h3>
      <p style={{ color: '#8B8B9F', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Lets the app remember details from your past conversations and bring up
        what&apos;s relevant. Preset because this is the only service that
        provides it &mdash; changing it would erase what the app has already
        remembered.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#F5F5FA' }}>
          <input
            type="checkbox"
            checked={s.enabled}
            disabled={s.loading || s.saving}
            onChange={(e) => void patch({ enabled: e.target.checked })}
          />
          <span>Remember details from my conversations</span>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Field label="Provider" value="OpenAI" locked />
        <Field label="Model"    value="text-embedding-3-small" locked />
      </div>

      {/* Build 6 fix: the OpenAI key input is BYOK-only. Developer-paid
          end users don't supply a key — the developer's project key
          handles embedding. Showing the input to them would be wrong. */}
      {s.byokMode ? (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#8B8B9F', marginBottom: 4 }}>
            OpenAI API key {s.has_key ? <span style={{ color: '#9AE0C1' }}>(saved)</span> : <span style={{ color: '#E0A89A' }}>(not set)</span>}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={s.keyInput}
              placeholder={s.key_masked ?? 'sk-…'}
              onChange={(e) => setS(prev => ({ ...prev, keyInput: e.target.value }))}
              disabled={s.loading || s.saving}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid #2A2A3A', background: '#0A0A12',
                color: '#F5F5FA', fontSize: 13, fontFamily: 'ui-monospace, monospace',
              }}
            />
            <button
              type="button"
              disabled={!s.keyInput || s.saving}
              onClick={() => void patch({ openai_api_key: s.keyInput })}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: '#00D68F', color: '#0A0A12', fontSize: 13, fontWeight: 500,
                cursor: s.keyInput ? 'pointer' : 'not-allowed',
                opacity: s.keyInput ? 1 : 0.5,
              }}
            >
              Save
            </button>
            {s.has_key && (
              <button
                type="button"
                disabled={s.saving}
                onClick={() => void patch({ openai_api_key: '' })}
                style={{
                  padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #2A2A3A', background: 'transparent',
                  color: '#8B8B9F', fontSize: 13, cursor: 'pointer',
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 12, fontSize: 12, color: '#8B8B9F', fontStyle: 'italic' }}>
          Memory runs on the app developer&apos;s OpenAI key &mdash; use the
          toggle above to turn it off if you&apos;d rather not have past
          conversations remembered.
        </p>
      )}

      {s.error && (
        <p style={{ marginTop: 12, fontSize: 12, color: '#E0A89A' }}>
          {s.error}
        </p>
      )}
    </div>
  );
}

function Field({ label, value, locked }: { label: string; value: string; locked?: boolean }): JSX.Element {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#8B8B9F', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        disabled={locked}
        aria-disabled={locked}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1px solid #2A2A3A', background: '#0A0A12',
          color: '#8B8B9F', fontSize: 13, cursor: 'not-allowed',
        }}
      />
    </div>
  );
}
