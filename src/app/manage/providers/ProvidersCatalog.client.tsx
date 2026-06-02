// src/app/manage/providers/ProvidersCatalog.client.tsx
//
// v1.3.5 2026-05-29 — refactored to per-tool dropdown selection.
//
// Two sections on this page:
//   (1) "Credentials" — collapsible per-category list with credential
//       editors for each provider. The developer adds / rotates / clears
//       API keys here. Writes via PATCH /api/settings/byok (encrypted on
//       the route).
//   (2) "Tool routing" — for each tool in the catalogue that has 2+
//       capability-matching providers configured, a dropdown to pin
//       that tool to a specific provider. Writes via PATCH
//       /api/settings/capabilities with set_tool_override.
//
// Why per-tool here (and priority list in /devshell/providers/): app
// runtime is repetitive — the developer wants a tool to consistently
// route to a specific provider regardless of category defaults. The
// priority-chain model that works for non-repetitive DevShell work is
// the wrong abstraction here.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PROVIDER_REGISTRY,
  type ProviderDefinition,
  type ProviderCategory,
  type CapabilityConfig,
  type CapabilityConfigResponse,
  type CapabilityCatalogueItem,
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
  const [byok,      setByok]      = useState<ByokResponse | null>(null);
  const [config,    setConfig]    = useState<CapabilityConfig | null>(null);
  const [catalogue, setCatalogue] = useState<CapabilityCatalogueItem[] | null>(null);
  const [loadErr,   setLoadErr]   = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [byokRes, capRes] = await Promise.all([
        fetch('/api/settings/byok'),
        fetch('/api/settings/capabilities'),
      ]);
      if (!byokRes.ok) throw new Error(`byok load failed: ${byokRes.status}`);
      if (!capRes.ok)  throw new Error(`capabilities load failed: ${capRes.status}`);
      setByok(await byokRes.json());
      const capJson: CapabilityConfigResponse = await capRes.json();
      setConfig(capJson.config);
      setCatalogue(capJson.catalogue);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
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
    return <div style={errorBoxStyle}><strong>Couldn't load provider data:</strong> {loadErr}</div>;
  }
  if (!byok || !config || !catalogue) {
    return <div style={{ color: 'var(--c-text-3)', fontSize: 13 }}>Loading…</div>;
  }

  const appshellOverrides = config.appshell.tool_overrides ?? {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <h2 style={sectionHeaderStyle}>Credentials</h2>
        <p style={sectionDescStyle}>
          Add / rotate / clear provider keys. Keys are stored encrypted on your
          Supabase instance using the shared <code>SECRETS_ENCRYPTION_KEY</code>.
        </p>
        <CredentialsSection grouped={grouped} byok={byok} onSaved={reload} />
      </section>

      <section>
        <h2 style={sectionHeaderStyle}>Tool routing</h2>
        <p style={sectionDescStyle}>
          For each tool that has multiple capability-matching providers configured,
          pin it to a specific provider. Tools without overrides follow your
          DevShell priority list (set in <code>/devshell/providers/</code>) for
          DevShell calls, and the category default for app-runtime calls. To
          override at call time, pass <code>provider</code> in the tool input.
        </p>
        <ToolRoutingSection
          grouped={grouped}
          byok={byok}
          catalogue={catalogue}
          overrides={appshellOverrides}
          onSaved={reload}
        />
      </section>
    </div>
  );
}

// ── Credentials section ─────────────────────────────────────────────────────

const CredentialsSection: React.FC<{
  grouped: Partial<Record<ProviderCategory, ProviderDefinition[]>>;
  byok:    ByokResponse;
  onSaved: () => void;
}> = ({ grouped, byok, onSaved }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {CATEGORY_ORDER.map(category => {
        const providers = grouped[category];
        if (!providers || providers.length === 0) return null;
        const label = CATEGORY_LABELS[category] ?? String(category);
        const configuredCount = providers.filter(p =>
          byok.providers[p.id] !== undefined || p.required_inputs.length === 0,
        ).length;
        return (
          <details key={category} style={{
            border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)',
          }}>
            <summary style={{
              cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
              listStyle: 'none', fontWeight: 600, fontSize: 14,
            }}>
              <span>{label}</span>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 500, marginLeft: 'auto' }}>
                {configuredCount} / {providers.length} configured
              </span>
            </summary>
            <div style={{ padding: '0 14px 12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {providers.map(p => <CredentialRow key={p.id} provider={p} statusEntry={byok.providers[p.id]} onSaved={onSaved} />)}
            </div>
          </details>
        );
      })}
    </div>
  );
};

const CredentialRow: React.FC<{
  provider:    ProviderDefinition;
  statusEntry: { masked: string; updated_at: string } | undefined;
  onSaved:     () => void;
}> = ({ provider, statusEntry, onSaved }) => {
  const isBuiltIn  = provider.required_inputs.length === 0;
  const configured = !!statusEntry;
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  if (isBuiltIn) {
    return (
      <div style={rowStyle}>
        <span style={{ fontWeight: 600, flex: 1 }}>{provider.name}</span>
        <Pill tone="info">Built-in (no key required)</Pill>
      </div>
    );
  }

  const submit = async (): Promise<void> => {
    if (draft.length < 8) { setErr('Key looks too short.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/settings/byok', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ set_provider: { id: provider.id, value: draft } }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || j.error || `HTTP ${r.status}`);
      }
      setDraft(''); setEditing(false); onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, flex: 1 }}>{provider.name}</span>
        {configured ? <Pill tone="success">Configured</Pill> : <Pill tone="muted">Not configured</Pill>}
        {statusEntry && <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text-3)' }}>{statusEntry.masked}</span>}
        <button type="button" onClick={() => setEditing(e => !e)} style={editButtonStyle}>
          {editing ? 'Cancel' : configured ? 'Rotate' : 'Add key'}
        </button>
      </div>
      {editing && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            type="password" value={draft} onChange={e => { setDraft(e.target.value); setErr(null); }}
            placeholder={provider.required_inputs[0]?.env_key ?? ''}
            autoComplete="off" style={inputStyle}
          />
          <button type="button" onClick={() => void submit()} disabled={busy || draft.length < 8} style={primaryButtonStyle(busy || draft.length < 8)}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
      {err && <div style={{ color: 'var(--c-error, #E33)', fontSize: 12, marginTop: 4 }}>{err}</div>}
    </div>
  );
};

// ── Tool routing section ────────────────────────────────────────────────────

const ToolRoutingSection: React.FC<{
  grouped:   Partial<Record<ProviderCategory, ProviderDefinition[]>>;
  byok:      ByokResponse;
  catalogue: CapabilityCatalogueItem[];
  overrides: Record<string, string>;
  onSaved:   () => void;
}> = ({ grouped, byok, catalogue, overrides, onSaved }) => {
  // Only tools (not skills) and only those that have a category we know
  // about and 2+ capability-matching providers configured.
  const tools = catalogue.filter(c => c.kind === 'tool');

  // For each tool, compute the candidate providers: configured providers
  // in the tool's category (we can't read the platform's required_capability
  // field directly here; the category is the best proxy on the deployed
  // side). Tools with <2 candidates don't need a dropdown.
  const rows = tools.map(t => {
    const providers = grouped[t.category as ProviderCategory] ?? [];
    const candidates = providers.filter(p =>
      p.required_inputs.length === 0 || !!byok.providers[p.id],
    );
    return { tool: t, candidates };
  }).filter(({ candidates }) => candidates.length >= 2);

  if (rows.length === 0) {
    return (
      <div style={{ ...rowStyle, fontSize: 13, color: 'var(--c-text-3)' }}>
        No tools have multiple capability-matching providers configured yet.
        Add more keys above; this list populates automatically.
      </div>
    );
  }

  const saveOverride = async (toolId: string, providerId: string): Promise<void> => {
    try {
      const r = await fetch('/api/settings/capabilities', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          scope: 'appshell',
          set_tool_override: { tool_id: toolId, provider_id: providerId },
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onSaved();
    } catch (e) {
      console.error('Tool override save failed', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(({ tool, candidates }) => {
        const current = overrides[tool.id] ?? '';
        return (
          <div key={tool.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{tool.name}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: 'monospace' }}>{tool.id}</div>
            </div>
            <select
              value={current}
              onChange={e => void saveOverride(tool.id, e.target.value)}
              style={selectStyle}
            >
              <option value="">(follow category default)</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        );
      })}
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
    tone === 'success' ? 'var(--c-success, #3FA86E)' : 'var(--c-border)';
  return (
    <span style={{
      fontSize: 10, color, border: `1px solid ${border}`, borderRadius: 4,
      padding: '2px 6px', fontWeight: 500, textTransform: 'uppercase',
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 6, color: 'var(--c-text)',
};
const sectionDescStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5, marginTop: 0, marginBottom: 14,
};
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', borderRadius: 6,
  background: 'var(--c-bg)', border: '1px solid var(--c-border)',
};
const editButtonStyle: React.CSSProperties = {
  background: 'transparent', color: 'var(--c-text-2)',
  border: '1px solid var(--c-border)', borderRadius: 4,
  padding: '4px 10px', fontSize: 12, cursor: 'pointer',
};
const inputStyle: React.CSSProperties = {
  flex: 1, padding: '6px 10px', fontSize: 12, fontFamily: 'monospace',
  background: 'var(--c-surface)', color: 'var(--c-text)',
  border: '1px solid var(--c-border)', borderRadius: 4,
};
const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 12px', fontSize: 12, fontWeight: 600,
  background: 'var(--c-accent, #5856E5)', color: '#fff',
  border: 'none', borderRadius: 4,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
});
const selectStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12,
  background: 'var(--c-surface)', color: 'var(--c-text)',
  border: '1px solid var(--c-border)', borderRadius: 4, minWidth: 200,
};
const errorBoxStyle: React.CSSProperties = {
  padding: 12, border: '1px solid var(--c-error, #E33)', borderRadius: 6,
  color: 'var(--c-error, #E33)', fontSize: 13,
};
