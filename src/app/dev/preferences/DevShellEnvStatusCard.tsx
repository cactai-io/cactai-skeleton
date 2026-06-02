// src/app/dev/preferences/DevShellEnvStatusCard.tsx
//
// DevShell-flavored env-var status card. Hits the same /api/manage/env-status
// endpoint as the management panel's EnvStatusCard, but uses the /dev surface's
// hardcoded dark palette so it visually matches the rest of /dev/preferences.

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

export function DevShellEnvStatusCard(): React.ReactElement {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr]   = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/manage/env-status', { cache: 'no-store' });
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

  return (
    <section style={cardStyle}>
      <h2 style={cardTitleStyle}>Build-env status</h2>
      <p style={cardBodyStyle}>
        Runtime check of the env vars set by the platform&apos;s provisioner.
        Edit them in your Vercel project, then redeploy — values can&apos;t be
        changed from here.
      </p>

      {err && (
        <p style={{ ...cardBodyStyle, color: '#E33', marginTop: 12 }}>Could not load: {err}</p>
      )}

      {!data && !err && (
        <p style={{ ...cardBodyStyle, marginTop: 12 }}>Loading…</p>
      )}

      {data && (
        <>
          <div style={{
            marginTop: 14, marginBottom: 14, padding: 12,
            background: '#0D0D17', borderRadius: 6,
            border: '1px solid #25253A',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span aria-hidden style={{
                width: 8, height: 8, borderRadius: '50%',
                background: data.ai_provider_ready ? '#10b981' : '#E33',
                flexShrink: 0,
              }} />
              <strong style={{ color: '#F5F5FA' }}>AI provider ready:</strong>
              <span style={{ color: '#8B8B9F' }}>
                {data.ai_provider_ready
                  ? 'at least one of Anthropic / OpenAI is set'
                  : 'neither key set — turns will fail until one is added'}
              </span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: '#8B8B9F' }}>
                <th style={th}>Key</th>
                <th style={th}>Label</th>
                <th style={th}>Scope</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => (
                <tr key={item.key} style={{ borderTop: '1px solid #25253A' }}>
                  <td style={{ ...td, fontFamily: 'ui-monospace, monospace', color: '#8B8B9F' }}>{item.key}</td>
                  <td style={td}>{item.label}</td>
                  <td style={{ ...td, fontSize: 11, color: '#8B8B9F', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.scope}</td>
                  <td style={{ ...td, color: item.present ? '#10b981' : '#8B8B9F', fontWeight: 600 }}>
                    {item.present ? '✓ set' : '— not set'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ ...cardBodyStyle, marginTop: 12, fontSize: 11 }}>{data.note}</p>
        </>
      )}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  background:   '#13131A',
  border:       '1px solid #25253A',
  borderRadius: 10,
  padding:      20,
  marginBottom: 16,
};
const cardTitleStyle: React.CSSProperties = {
  fontSize:     14,
  fontWeight:   600,
  marginTop:    0,
  marginBottom: 8,
  color:        '#F5F5FA',
};
const cardBodyStyle: React.CSSProperties = {
  fontSize:   13,
  color:      '#8B8B9F',
  lineHeight: 1.6,
  margin:     0,
};
const th: React.CSSProperties = { textAlign: 'left', fontWeight: 400, padding: '6px 8px' };
const td: React.CSSProperties = { padding: '6px 8px', color: '#F5F5FA' };
