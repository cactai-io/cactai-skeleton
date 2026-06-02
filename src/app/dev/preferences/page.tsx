// src/app/dev/preferences/page.tsx
// DevShell preferences — IDE-scoped settings only.
//
// What lives here:
//   - DevShell-specific developer preferences (chat behavior, layout, etc.).
//     These haven't been built yet; the page is a placeholder describing
//     where each former section moved.
//
// What moved out:
//   - AppShell auth providers, signup policy, and invitations are all
//     app-running concerns, not IDE concerns. They live in the management
//     panel under /manage now.
//   - Project-level dev provider keys live in the platform dashboard at
//     cactai.io.

import Link from 'next/link';
import { DevShellEnvStatusCard } from './DevShellEnvStatusCard';

export default function PreferencesPage() {
  return (
    <div style={{
      minHeight:  '100vh',
      background: '#0A0A0F',
      color:      '#F5F5FA',
    }}>
      <main style={{
        padding:    32,
        fontFamily: 'Sora, system-ui, sans-serif',
        maxWidth:   720,
        margin:     '0 auto',
      }}>
        <Link
          href="/dev"
          style={{
            display:        'inline-block',
            marginBottom:   16,
            color:          '#8B8B9F',
            fontSize:       13,
            textDecoration: 'none',
          }}
        >
          ← Back to DevShell
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>DevShell preferences</h1>
        <p style={{ color: '#8B8B9F', fontSize: 13.5, marginBottom: 24, lineHeight: 1.6 }}>
          IDE-scoped settings will live here as they're added. Application-level
          settings have moved to make them easier to find.
        </p>

        <DevShellEnvStatusCard />

        <section style={cardStyle}>
          <h2 style={cardTitleStyle}>App-running settings</h2>
          <p style={cardBodyStyle}>
            Sign-in providers, signup policy, and invitations now live in your
            management panel — visit your production deployment to manage them.
          </p>
        </section>

        <section style={cardStyle}>
          <h2 style={cardTitleStyle}>Account &amp; provider keys</h2>
          <p style={cardBodyStyle}>
            Cactai-account settings, billing, and dev-environment provider keys
            are in the platform dashboard at cactai.io.
          </p>
        </section>
      </main>
    </div>
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
};
const cardBodyStyle: React.CSSProperties = {
  fontSize:     13,
  color:        '#8B8B9F',
  lineHeight:   1.6,
  margin:       0,
};
