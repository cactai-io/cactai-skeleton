// src/app/manage/components/ModelSelectionCard.tsx
// Management-panel card wrapping the @cactai-io/mui ModelSelectionPanel
// (v1.3 Phase 14, Gap 81). Loads + saves model selections through the
// /api/manage/model-selections route; loads resolved model IDs via the
// platform's fallback registry (cheap; precise daily-refreshed IDs come
// from ModelResolver server-side when the developer cares — the panel
// surfaces these as muted secondary text).

'use client';

import React, { useEffect, useState } from 'react';
import { lensFetch } from '@/lib/lens-tab';
import { ModelSelectionPanel, PANEL_DEFAULT_SELECTIONS } from '@cactai-io/mui';
import type { AgentTaskTypeSlug } from '@cactai-io/types';
import type { JSX } from 'react';

type Tier = 'haiku' | 'sonnet' | 'opus';

// Fallback model IDs for the resolved-model-ID column. Live values come
// from the platform's ModelResolver / @cactai-io/core ANTHROPIC_FALLBACK.
// Kept here as a graceful default — when the live values aren't loaded
// the panel still shows something meaningful.
const FALLBACK_MODEL_IDS = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus:   'claude-opus-4-7',
};

export function ModelSelectionCard(): JSX.Element {
  const [selections, setSelections] = useState<Partial<Record<AgentTaskTypeSlug, Tier>>>(PANEL_DEFAULT_SELECTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res  = await lensFetch('/api/manage/model-selections');
        const data = await res.json() as { selections: Partial<Record<AgentTaskTypeSlug, Tier>> | null };
        if (data.selections) {
          // Merge with defaults so a partial saved set fills out
          // missing keys with the platform default.
          setSelections({ ...PANEL_DEFAULT_SELECTIONS, ...data.selections });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSelections = async (next: Partial<Record<AgentTaskTypeSlug, Tier>>): Promise<void> => {
    setSelections(next);
    try {
      const res = await lensFetch('/api/manage/model-selections', {
        method:  'PUT',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ selections: next }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        throw new Error(errJson.detail ?? errJson.error ?? 'save failed');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
        Loading model selections…
      </div>
    );
  }

  return (
    <div style={{
      padding:       16,
      border:        '1px solid var(--ds-border-1, #e5e7eb)',
      borderRadius:  8,
      marginBottom:  16,
    }}>
      {error && (
        <div style={{ marginBottom: 12, color: 'var(--ds-error, #dc2626)', fontSize: 13 }}>
          Error: {error}
        </div>
      )}
      <ModelSelectionPanel
        selections={selections}
        resolvedModelIds={FALLBACK_MODEL_IDS}
        onChange={(next) => void saveSelections(next)}
        manageMode={true}
        endUserVisible={true}
        endUserEditable={false}
        adminOnly={{}}
        onManageChange={() => {
          // Management zone-level toggles are persisted alongside the
          // selections in a follow-up; Phase 14 ships the per-row
          // tier picker. The toggles change UI state only for now.
        }}
      />
    </div>
  );
}
