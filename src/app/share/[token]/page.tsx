// src/app/share/[token]/page.tsx
// Sharing module — PUBLIC read-only viewer for a shared link.
//
// Anonymous-accessible (no auth): resolveShareLink uses the service-role
// connection, treating the token as the credential. Part of the 'sharing'
// registry entry; deleted on Remove.
//
// This is the framework shell. The build wires the actual read-only renderer
// for each `resource_type` (recipes, documents, …) where marked below — the
// skeleton ships the link resolution + the page frame, not domain renderers.

import { resolveShareLink } from '@/lib/sharing.server';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedView({ params }: Props) {
  const { token } = await params;
  const link = await resolveShareLink(token);

  if (!link) {
    return (
      <main style={frameStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Link unavailable</h1>
          <p style={{ color: '#8B8B9F', fontSize: 14, marginTop: 8 }}>
            This shared link is invalid or has expired.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={frameStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B8B9F' }}>
          Shared · read-only
        </div>
        {/* BUILD WIRES THE RENDERER HERE: render `link.resource_type` /
            `link.resource_id` read-only (or copyable/interactive per link.mode).
            The skeleton frame shows the reference until the build fills it in. */}
        <div style={{ marginTop: 12, fontSize: 14, color: '#F5F5FA' }}>
          {link.resource_type} · {link.resource_id}
        </div>
      </div>
    </main>
  );
}

const frameStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif',
};
const cardStyle: React.CSSProperties = {
  background: '#13131F', border: '1px solid #1E1E2E', borderRadius: 16,
  padding: 32, width: 420, maxWidth: '90vw',
};
