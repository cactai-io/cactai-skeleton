// src/app/operate/providers/ProvidersCatalog.client.tsx
//
// Client component for /operate/providers. Iterates PROVIDER_REGISTRY,
// groups by ProviderCategory, renders expandable sections per category
// with a credential editor per provider. Save → PATCH /api/settings/byok
// (the route encrypts before persisting to project_state.decisions.byok).
//
// Status indicators per provider:
//   - "Configured" pill (with last-4 of envelope) when a key is set
//   - "Not configured" pill when absent
//   - "Built-in (no key required)" when the provider has no required_inputs
//     (pgvector, isolated-vm, etc.)

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  PROVIDER_REGISTRY,
  type ProviderDefinition,
  type ProviderCategory,
} from '@cactai-io/types';

interface ByokResponse {
  enabled:   boolean;
  providers: Record<string, { masked: string; updated_at: string }>;
}

const CATEGORY_LABELS: Partial<Record<ProviderCategory, string>> = {
  ai:                   'AI text / chat',
  search:               'Web search',
  media_generation:     'Image generation',
  video_generation:     'Video generation',
  avatar_generation:    'Avatar / talking-head',
  audio_generation:     'Audio (voice, music, SFX)',
  threed_generation:    '3D generation',
  character_generation: 'Game characters',
  motion_capture:       'Motion capture',
  npc_intelligence:     'NPC intelligence',
  synthetic_data:       'Synthetic data',
  transcription:        'Audio transcription',
  translation:          'Translation',
  vector_store:         'Vector store',
  email:                'Email delivery',
  sms:                  'SMS / MMS',
  identity:             'End-user sign-in (OAuth)',
  payments:             'Payments',
  code_execution:       'Code execution',
  cms:                  'CMS',
  crm:                  'CRM',
  productivity:         'Productivity integrations',
  deployment:           'Deployment',
};

// Category display order — matches the wizard so developers see the
// same grouping in both surfaces.
const CATEGORY_ORDER: ProviderCategory[] = [
  'ai',
  'media_generation', 'video_generation', 'avatar_generation', 'audio_generation',
  'threed_generation', 'character_generation', 'motion_capture', 'npc_intelligence',
  'synthetic_data',
  'transcription', 'translation', 'search',
  'vector_store',
  'email', 'sms', 'identity',
  'payments', 'code_execution',
  'cms', 'crm', 'productivity', 'deployment',
];

export function ProvidersCatalogClient(): React.JSX.Element {
  const [status, setStatus] = useState<ByokResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const r = await fetch('/api/settings/byok');
      if (!r.ok) throw new Error(`byok load failed: HTTP ${r.status}`);
      setStatus(await r.json());
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Unknown error.');
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const grouped = useMemo(() => {
    const out: Partial<Record<ProviderCategory, ProviderDefinition[]>> = {};
    for (const p of Object.values(PROVIDER_REGISTRY) as ProviderDefinition[]) {
      const list = out[p.category] ?? (out[p.category] = []);
      list.push(p);
    }
    return out;
  }, []);

  if (loadErr) {
    return (
      <div style={errorBoxStyle}>
        <strong>Couldn't load provider status:</strong> {loadErr}
      </div>
    );
  }
  if (!status) {
    return <div style={{ color: 'var(--c-text-3)', fontSize: 13 }}>Loading…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {CATEGORY_ORDER.map(category => {
        const providers = grouped[category];
        if (!providers || providers.length === 0) return null;
        const label = CATEGORY_LABELS[category] ?? String(category);
        const configuredCount = providers.filter(p =>
          status.providers[p.id] !== undefined || p.required_inputs.length === 0,
        ).length;
        return (
          <CategorySection
            key={category}
            label={label}
            configuredCount={configuredCount}
            totalCount={providers.length}
          >
            {providers.map(p => (
              <ProviderRow
                key={p.id}
                provider={p}
                statusEntry={status.providers[p.id]}
                onSaved={() => void reload()}
              />
            ))}
          </CategorySection>
        );
      })}
    </div>
  );
}

// ── Category section (collapsible) ──────────────────────────────────────────

const CategorySection: React.FC<{
  label:           string;
  configuredCount: number;
  totalCount:      number;
  children:        React.ReactNode;
}> = ({ label, configuredCount, totalCount, children }) => (
  <details style={{
    border:       '1px solid var(--c-border)',
    borderRadius: 8,
    background:   'var(--c-surface)',
  }}>
    <summary style={{
      cursor:       'pointer',
      padding:      '12px 16px',
      display:      'flex',
      alignItems:   'center',
      gap:          10,
      listStyle:    'none',
      fontWeight:   600,
    }}>
      <span>{label}</span>
      <span style={{
        fontSize:    11,
        color:       'var(--c-text-3)',
        fontWeight:  500,
        marginLeft:  'auto',
      }}>
        {configuredCount} / {totalCount} configured
      </span>
    </summary>
    <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children}
    </div>
  </details>
);

// ── Per-provider row + inline credential editor ─────────────────────────────

const ProviderRow: React.FC<{
  provider:    ProviderDefinition;
  statusEntry: { masked: string; updated_at: string } | undefined;
  onSaved:     () => void;
}> = ({ provider, statusEntry, onSaved }) => {
  const isBuiltIn  = provider.required_inputs.length === 0;
  const configured = !!statusEntry;
  const [editing, setEditing] = useState(false);

  return (
    <div style={{
      border:       '1px solid var(--c-border)',
      borderRadius: 6,
      padding:      '10px 12px',
      background:   configured ? 'color-mix(in srgb, var(--c-success, #3FA86E) 4%, transparent)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{provider.name}</span>
        {isBuiltIn
          ? <Pill tone="info">Built-in (no key required)</Pill>
          : configured
          ? <Pill tone="success">Configured</Pill>
          : <Pill tone="muted">Not configured</Pill>
        }
        {statusEntry && (
          <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: 'monospace' }}>
            {statusEntry.masked}
          </span>
        )}
        {!isBuiltIn && (
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            style={editButtonStyle}
          >
            {editing ? 'Cancel' : configured ? 'Rotate' : 'Add key'}
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--c-text-2)', margin: '4px 0 0', lineHeight: 1.4 }}>
        {provider.description}
      </p>
      {editing && (
        <CredentialEditor
          provider={provider}
          onSaved={() => { setEditing(false); onSaved(); }}
        />
      )}
    </div>
  );
};

// ── Credential editor (handles single + multi-input providers) ──────────────

const CredentialEditor: React.FC<{
  provider: ProviderDefinition;
  onSaved:  () => void;
}> = ({ provider, onSaved }) => {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);
  // Per-provider, providers with multiple required inputs (Twilio, OAuth
  // pairs) need each value collected. For the v1 of this page we only
  // wire single-input providers (the common case). Multi-input rendering
  // is in the wizard's StepProviders.tsx — port that here when needed.
  const [draft, setDraft] = useState('');

  const singleInput = provider.required_inputs.length === 1 ? provider.required_inputs[0] : null;

  if (!singleInput) {
    return (
      <div style={{ ...notesStyle, marginTop: 8 }}>
        This provider has multiple required inputs ({provider.required_inputs.map(i => i.label).join(', ')}).
        Multi-input editing isn't wired in this page yet — configure via Vercel env vars for now,
        or hold for the multi-input editor port.
      </div>
    );
  }

  const submit = async (): Promise<void> => {
    if (draft.length < 8) {
      setErr('Key looks too short. Paste the full secret.');
      return;
    }
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/settings/byok', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          set_provider: { id: provider.id, value: draft },
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || j.error || `HTTP ${r.status}`);
      }
      setDraft('');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
        {singleInput.label}
        {singleInput.help && <span style={{ marginLeft: 6, fontStyle: 'italic' }}>· {singleInput.help}</span>}
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="password"
          value={draft}
          onChange={e => { setDraft(e.target.value); setErr(null); }}
          placeholder={singleInput.env_key ?? singleInput.id}
          autoComplete="off"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || draft.length < 8}
          style={primaryButtonStyle(busy || draft.length < 8)}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
      {err && <div style={{ color: 'var(--c-error, #E33)', fontSize: 12 }}>{err}</div>}
    </div>
  );
};

// ── Visual primitives ───────────────────────────────────────────────────────

const Pill: React.FC<{ tone: 'success' | 'info' | 'muted'; children: React.ReactNode }> = ({ tone, children }) => {
  const color =
    tone === 'success' ? 'var(--c-success, #3FA86E)' :
    tone === 'info'    ? 'var(--c-text-2)' :
                         'var(--c-text-3)';
  const border =
    tone === 'success' ? 'var(--c-success, #3FA86E)' :
                         'var(--c-border)';
  return (
    <span style={{
      fontSize:    10,
      color,
      border:      `1px solid ${border}`,
      borderRadius: 4,
      padding:     '2px 6px',
      fontWeight:  500,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace:  'nowrap',
    }}>{children}</span>
  );
};

const editButtonStyle: React.CSSProperties = {
  marginLeft:    'auto',
  background:    'transparent',
  color:         'var(--c-text-2)',
  border:        '1px solid var(--c-border)',
  borderRadius:  4,
  padding:       '4px 10px',
  fontSize:      12,
  cursor:        'pointer',
};

const inputStyle: React.CSSProperties = {
  flex:          1,
  padding:       '6px 10px',
  fontSize:      12,
  fontFamily:    'monospace',
  background:    'var(--c-bg)',
  color:         'var(--c-text)',
  border:        '1px solid var(--c-border)',
  borderRadius:  4,
};

const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding:       '6px 12px',
  fontSize:      12,
  fontWeight:    600,
  background:    'var(--c-accent, #5856E5)',
  color:         '#fff',
  border:        'none',
  borderRadius:  4,
  cursor:        disabled ? 'not-allowed' : 'pointer',
  opacity:       disabled ? 0.5 : 1,
});

const notesStyle: React.CSSProperties = {
  fontSize:    12,
  color:       'var(--c-text-3)',
  fontStyle:   'italic',
  padding:     '6px 8px',
  background:  'var(--c-bg)',
  borderRadius: 4,
};

const errorBoxStyle: React.CSSProperties = {
  padding:     12,
  border:      '1px solid var(--c-error, #E33)',
  borderRadius: 6,
  color:       'var(--c-error, #E33)',
  fontSize:    13,
};
