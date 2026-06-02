// src/app/page.tsx
// Root page — checks env vars, then routes by role and deployment environment.
//
// Routing:
//   VERCEL_ENV=preview  + dev/collaborator → /dev  (DevShell)
//   VERCEL_ENV=production + dev/collaborator → /manage (management panel)
//   Any env + app roles (super_admin, admin, user) → /app
//   Unauthenticated → /auth/login
//   Provisioning incomplete → holding screen
//
// Consumes theme via CSS custom properties from @cactai-io/brand-tokens, with
// hex fallbacks on the holding screen specifically — brand-tokens.css may
// not be loaded before provisioning completes, so inline fallbacks keep the
// screen readable in the pre-provisioning state.

import { redirect } from 'next/navigation';
import { getSessionUser, getPostLoginRedirect } from '@/lib/auth';

const REQUIRED_VARS = [
  'CACTAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

function getMissingVars(): string[] {
  return REQUIRED_VARS.filter(v => !process.env[v]);
}

export default async function RootPage() {
  const missing = getMissingVars();

  if (missing.length > 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--f-ui)',
        // intentionally outside brand tokens — semantic role differs from theme accent.
        // Holding screen renders before theme tokens are loaded; vars resolve when
        // available, hex fallbacks render until then.
        color: 'var(--c-text-2, #8B8B9F)',
        background: 'var(--c-bg, #0A0A0F)',
        gap: 12,
      }}>
        <svg width="32" height="32" viewBox="0 0 100 100" fill="url(#g)">
          <defs>
            {/* Sunset gradient stops — preserved as raw hex per the SVG-defs rule. */}
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB44D"/>
              <stop offset="100%" stopColor="#9A3CFF"/>
            </linearGradient>
          </defs>
          <path d="M40 12 Q40 8 44 8 L56 8 Q60 8 60 12 L60 30 Q60 32 62 32 L72 32 Q78 32 78 38 Q78 50 78 58 Q78 62 74 62 L62 62 Q60 62 60 64 L60 86 Q60 92 54 92 L46 92 Q40 92 40 86 L40 70 Q40 68 38 68 L28 68 Q22 68 22 62 Q22 50 22 42 Q22 38 26 38 L38 38 Q40 38 40 36 Z"/>
        </svg>
        <div style={{ fontSize: 14 }}>Provisioning in progress…</div>
        <div style={{
          fontSize: 11,
          // intentionally outside brand tokens — secondary holding-screen tone,
          // semantic role differs from theme accent. Hex fallback for the
          // pre-provisioning render.
          color: 'var(--c-text-3, #5A5A6E)',
        }}>
          Waiting for: {missing.join(', ')}
        </div>
      </div>
    );
  }

  const user = await getSessionUser();
  if (user) {
    redirect(getPostLoginRedirect(user));
  } else {
    redirect('/auth/login');
  }
}
