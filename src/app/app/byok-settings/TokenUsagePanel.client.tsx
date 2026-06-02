// src/app/app/byok-settings/TokenUsagePanel.client.tsx
//
// v1.3.5 Build 3 — End-user BYOK token-usage display (R6).
// Mirrors the management-panel TokenUsageCard but scoped to ONE end user.

'use client';

import React, { useEffect, useState } from 'react';
import type { JSX } from 'react';

interface Bucket {
  provider:        string;
  model_id:        string;
  caller_category: string;
  tokens_input:    number;
  tokens_output:   number;
}

const CALLER_LABEL: Record<string, string> = {
  system_ai:        'System AI',
  tool:             'Tool',
  skill_generation: 'Skill generation',
  agentic_coding:   'Agentic coding',
  quick_code_tool:  'Quick code tool',
};

export function TokenUsagePanel(): JSX.Element {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/byok/token-usage', { cache: 'no-store' });
        const data = await res.json() as { buckets?: Bucket[] };
        setBuckets(data.buckets ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{
      background: '#13131F', border: '1px solid #1E1E2E', borderRadius: 12,
      padding: 20,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 500, color: '#F5F5FA', margin: 0, marginBottom: 12 }}>
        Token usage (this month)
      </h3>
      {loading && <p style={{ color: '#5A5A6E', fontSize: 13 }}>Loading…</p>}
      {error && <p style={{ color: '#FF6B35', fontSize: 13 }}>{error}</p>}
      {!loading && !error && buckets.length === 0 && (
        <p style={{ color: '#5A5A6E', fontSize: 13 }}>
          No usage against your keys this month. Calls without your own key fall
          back to the developer's configured provider — those aren't counted here.
        </p>
      )}
      {buckets.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={th}>Provider</th>
              <th style={th}>Model</th>
              <th style={th}>Caller</th>
              <th style={th}>Input</th>
              <th style={th}>Output</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b, i) => (
              <tr key={i}>
                <td style={td}>{b.provider}</td>
                <td style={td}><code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{b.model_id}</code></td>
                <td style={td}>{CALLER_LABEL[b.caller_category] ?? b.caller_category}</td>
                <td style={td}>{b.tokens_input.toLocaleString()}</td>
                <td style={td}>{b.tokens_output.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '6px 10px', color: '#8B8B9F',
  borderBottom: '1px solid #1E1E2E', fontWeight: 500,
};
const td: React.CSSProperties = {
  padding: '6px 10px', color: '#E5E5EA',
  borderBottom: '1px solid #13131F',
};
