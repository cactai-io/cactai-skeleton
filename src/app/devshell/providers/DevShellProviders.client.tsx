// src/app/devshell/providers/DevShellProviders.client.tsx
//
// Priority-list UI per category. Reads BYOK status (which providers are
// configured) + CapabilityConfig (current priority lists) and lets the
// developer reorder configured providers within each category.
//
// Save model: every ↑/↓ click immediately PATCHes the API with the new
// ordered_provider_ids array. Lightweight — no submit button, no draft
// state. If the patch fails, the UI re-fetches and snaps back.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PROVIDER_REGISTRY,
  type ProviderDefinition,
  type ProviderCategory,
  type CapabilityConfig,
  type CapabilityConfigResponse,
} from '@cactai-io/types';

const CATEGORY_LABELS: Partial<Record<ProviderCategory, string>> = {
  ai:                   'AI text / chat',
  media_generation:     'Image generation',
  video_generation:     'Video generation',
  avatar_generation:    'Avatar / talking-head',
  audio_generation:     'Audio (voice, music, SFX)',
  threed_generation:    '3D generation',
  character_generation: 'Game characters',
  motion_capture:       'Motion capture',
  npc_intelligence:     'NPC intelligence',
  synthetic_data:       'Synthetic data',
};

const CATEGORY_ORDER: ProviderCategory[] = [
  'ai',
  'media_generation', 'video_generation', 'avatar_generation', 'audio_generation',
  'threed_generation', 'character_generation', 'motion_capture', 'npc_intelligence',
  'synthetic_data',
];

interface ByokResponse {
  enabled:   boolean;
  providers: Record<string, { masked: string; updated_at: string }>;
}

export function DevShellProvidersClient(): React.JSX.Element {
  const [byok,    setByok]    = useState<ByokResponse | null>(null);
  const [config,  setConfig]  = useState<CapabilityConfig | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

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
    return <div style={errorBoxStyle}><strong>Couldn't load routing config:</strong> {loadErr}</div>;
  }
  if (!byok || !config) {
    return <div style={{ color: 'var(--c-text-3)', fontSize: 13 }}>Loading…</div>;
  }

  // For each category, compute the ordered list of CONFIGURED providers.
  // priority_by_category from server is the developer's saved order;
  // any configured provider not in that list gets appended at the end.
  const devshellPriority = config.devshell.priority_by_category ?? {};

  const savePriority = async (category: string, orderedIds: string[]): Promise<void> => {
    try {
      const res = await fetch('/api/settings/capabilities', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          scope: 'devshell',
          set_priority: { category, ordered_provider_ids: orderedIds },
        }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      await reload();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {CATEGORY_ORDER.map(category => {
        const allInCategory = grouped[category];
        if (!allInCategory) return null;
        // Only configured providers participate in the priority list.
        const configured = allInCategory.filter(p =>
          p.required_inputs.length === 0 || !!byok.providers[p.id],
        );
        if (configured.length === 0) return null;

        const savedOrder = devshellPriority[category] ?? [];
        // Merge saved order with any new configured providers (appended).
        const ordered = [
          ...savedOrder.filter(id => configured.some(p => p.id === id)),
          ...configured.map(p => p.id).filter(id => !savedOrder.includes(id)),
        ];

        const move = (idx: number, delta: number): void => {
          const next = [...ordered];
          const swapIdx = idx + delta;
          if (swapIdx < 0 || swapIdx >= next.length) return;
          [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
          void savePriority(category, next);
        };

        const label = CATEGORY_LABELS[category] ?? String(category);

        return (
          <section key={category} style={categoryBoxStyle}>
            <h2 style={categoryTitleStyle}>{label}</h2>
            {ordered.length === 1 ? (
              <p style={singleNoteStyle}>
                Only one provider configured. Add more in the project wizard or under{' '}
                <code style={{ fontSize: 12 }}>/operate/providers</code>.
              </p>
            ) : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ordered.map((id, idx) => {
                  const provider = configured.find(p => p.id === id);
                  if (!provider) return null;
                  return (
                    <li key={id} style={rowStyle}>
                      <span style={positionStyle}>{idx + 1}</span>
                      <span style={{ fontWeight: 600, flex: 1 }}>{provider.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{idx === 0 ? 'Primary' : `Fallback ${idx}`}</span>
                      <button
                        type="button"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        style={arrowButtonStyle(idx === 0)}
                        aria-label="Move up"
                      >↑</button>
                      <button
                        type="button"
                        onClick={() => move(idx, 1)}
                        disabled={idx === ordered.length - 1}
                        style={arrowButtonStyle(idx === ordered.length - 1)}
                        aria-label="Move down"
                      >↓</button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

const categoryBoxStyle: React.CSSProperties = {
  border: '1px solid var(--c-border)', borderRadius: 8,
  background: 'var(--c-surface)', padding: 16,
};
const categoryTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12, color: 'var(--c-text)',
};
const singleNoteStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--c-text-3)', margin: 0,
};
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', borderRadius: 6,
  background: 'var(--c-bg)', border: '1px solid var(--c-border)',
};
const positionStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--c-text-2)',
  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
  borderRadius: 4, padding: '2px 8px', minWidth: 22, textAlign: 'center',
};
const arrowButtonStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'transparent', color: 'var(--c-text-2)',
  border: '1px solid var(--c-border)', borderRadius: 4,
  padding: '4px 10px', fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
});
const errorBoxStyle: React.CSSProperties = {
  padding: 12, border: '1px solid var(--c-error, #E33)', borderRadius: 6,
  color: 'var(--c-error, #E33)', fontSize: 13,
};
