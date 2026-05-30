// src/app/operate/components/EnvStatusCard.tsx
//
// Runtime build-env status table. Mirrors the platform's project-page
// Env Var Status visualizer but answers the question from inside the
// deployed app: "are the env vars the provisioner set actually present
// in this Vercel deploy's process.env?"
//
// Reads /api/operate/env-status (super_admin lens only). Display-only —
// editing happens in the Vercel project settings, then redeploy.

'use client';

import React, { useEffect, useState } from 'react';

interface Item {
  key:     string;
  label:   string;
  scope:   'env' | 'byok';
  present: boolean;
}

interface Payload {
  items:              Item[];
  ai_provider_ready:  boolean;
  vercel_project_url: string | null;
  note:               string;
}

export function EnvStatusCard(): React.ReactElement {
  const [data, setData]   = useState<Payload | null>(null);
  const [err, setErr]     = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/operate/env-status', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `status_${res.status}`);
        }
        setData(await res.json() as Payload);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  if (err) {
    return (
      <div style={cardStyle}>
        <h2 style={cardTitle}>Build-env status</h2>
        <p style={{ ...mutedStyle, color: 'var(--c-danger)' }}>Could not load: {err}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={cardStyle}>
        <h2 style={cardTitle}>Build-env status</h2>
        <p style={mutedStyle}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={cardTitle}>Build-env status</h2>
      <p style={mutedStyle}>
        Runtime check of the env vars set by the provisioner. Edit them in your
        Vercel project, then redeploy — values can&apos;t be changed from here.
      </p>

      <div style={{ marginTop: 14, marginBottom: 14, padding: 12, background: 'var(--c-bg)', borderRadius: 'var(--r)', border: `1px solid var(--c-border)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Dot ok={data.ai_provider_ready} />
          <strong style={{ color: 'var(--c-text)' }}>AI provider ready:</strong>
          <span style={{ color: 'var(--c-text-2)' }}>
            {data.ai_provider_ready
              ? 'at least one of Anthropic / OpenAI is set'
              : 'neither Anthropic nor OpenAI key is present — the app cannot serve turns until one is added'}
          </span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: 'var(--c-text-2)' }}>
            <th style={th}>Key</th>
            <th style={th}>Label</th>
            <th style={th}>Scope</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map(item => (
            <tr key={item.key} style={{ borderTop: '1px solid var(--c-border)' }}>
              <td style={{ ...td, fontFamily: 'ui-monospace, monospace', color: 'var(--c-text-2)' }}>{item.key}</td>
              <td style={td}>{item.label}</td>
              <td style={{ ...td, fontSize: 11, color: 'var(--c-text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.scope}</td>
              <td style={{ ...td, color: item.present ? 'var(--c-success, #10b981)' : 'var(--c-text-2)', fontWeight: 600 }}>
                {item.present ? '✓ set' : '— not set'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ ...mutedStyle, marginTop: 12, fontSize: 11 }}>{data.note}</p>
    </div>
  );
}

const Dot: React.FC<{ ok: boolean }> = ({ ok }) => (
  <span
    aria-hidden
    style={{
      width: 8, height: 8, borderRadius: '50%',
      background: ok ? 'var(--c-success, #10b981)' : 'var(--c-danger, #dc2626)',
      flexShrink: 0,
    }}
  />
);

const cardStyle: React.CSSProperties = {
  background:    'var(--c-surface)',
  border:        '1px solid var(--c-border)',
  borderRadius:  'var(--r)',
  padding:       20,
  marginBottom:  20,
};
const cardTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)',
};
const mutedStyle: React.CSSProperties = {
  color: 'var(--c-text-2)', fontSize: 13, lineHeight: 1.5, margin: 0,
};
const th: React.CSSProperties = { textAlign: 'left', fontWeight: 400, padding: '6px 8px' };
const td: React.CSSProperties = { padding: '6px 8px', color: 'var(--c-text)' };
