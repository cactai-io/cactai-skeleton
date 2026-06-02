// src/app/manage/components/AIConfigurationCard.tsx
// Management-panel UI for the reasoning model selection. Reads/writes
// project_state.decisions.reasoning_model_v1 via /api/manage/ai-configuration.
//
// Choice surfaces:
//   - Sonnet (default) — production middle ground. Lower cost, faster.
//   - Opus             — higher quality reasoning, slower, ~5x cost.
//   - Auto             — clears the manual pick; the platform's classifier
//                        runs per turn to size reasoning (~$0.015/turn).
//
// The platform's OrchestrationEngine reads this at session-open and skips
// its classifier when a manual choice is set. See
// gas-engine-reasoning-tool-tier-implementation.md.

'use client';

import React, { useEffect, useState } from 'react';
import { lensFetch } from '@/lib/lens-tab';
import type { JSX } from 'react';

type ReasoningChoice = 'sonnet' | 'opus';
type ChoiceWithAuto  = ReasoningChoice | 'auto';

const TIER_INFO = `This controls the model used to plan your app's actions. A higher tier produces more thorough plans and better decisions about which tools to use, at higher cost per action. The default works well for most apps.`;

const OPTION_BLURBS: Record<ChoiceWithAuto, string> = {
  sonnet: 'Production default. Fast, capable reasoning. Best balance of cost and quality.',
  opus:   'Highest reasoning quality. ~5x the cost per turn. Pick when plan correctness matters more than latency.',
  auto:   'No manual pick — the platform classifies each turn and sizes reasoning to match (~$0.015/turn for the classifier).',
};

export function AIConfigurationCard(): JSX.Element {
  const [choice, setChoice]   = useState<ChoiceWithAuto>('auto');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res  = await lensFetch('/api/manage/ai-configuration');
        const data = await res.json() as { reasoning_model: ReasoningChoice | null };
        setChoice(data.reasoning_model ?? 'auto');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (next: ChoiceWithAuto): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const value: ReasoningChoice | null = next === 'auto' ? null : next;
      const res = await lensFetch('/api/manage/ai-configuration', {
        method:  'PUT',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ reasoning_model: value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        throw new Error(err.detail ?? err.error ?? 'failed to save');
      }
      setChoice(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="ai-config-card" style={{ padding: 16 }}>Loading…</div>;

  return (
    <div className="ai-config-card" style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Reasoning Model</h3>
        <button
          type="button"
          aria-label="What is this?"
          onClick={() => setShowInfo(v => !v)}
          style={{
            width: 20, height: 20, borderRadius: '50%', border: '1px solid #9ca3af',
            background: 'transparent', cursor: 'pointer', fontSize: 12, lineHeight: '18px', padding: 0,
          }}
        >
          i
        </button>
      </div>

      {showInfo && (
        <div
          role="dialog"
          aria-label="Reasoning model help"
          style={{
            background: '#f3f4f6', padding: 12, borderRadius: 6,
            marginBottom: 12, fontSize: 13, color: '#374151',
          }}
        >
          {TIER_INFO}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(['sonnet', 'opus', 'auto'] as const).map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: saving ? 'wait' : 'pointer' }}>
            <input
              type="radio"
              name="reasoning_model"
              value={opt}
              checked={choice === opt}
              onChange={() => void save(opt)}
              disabled={saving}
              style={{ marginTop: 4 }}
            />
            <div>
              <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{opt === 'auto' ? 'Auto (classifier)' : opt}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{OPTION_BLURBS[opt]}</div>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13 }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}
