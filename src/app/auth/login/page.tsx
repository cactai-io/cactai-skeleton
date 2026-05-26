// src/app/auth/login/page.tsx
// Login page — rendered for unauthenticated users.
// The UI is a stub; the agent replaces it with a styled version during workflow Stage 3.
// Auth methods (Google, Apple, email/password) are determined by skeleton.config.json auth.providers.
// Supabase Auth handles all credential verification.
//
// After successful auth, Supabase redirects to /auth/callback which sets the session cookie
// and redirects to /dev (dev role) or /app (all other roles).
//
// Client-only render: this page calls createClient() which reads NEXT_PUBLIC_SUPABASE_*
// env vars. We opt out of static prerender so a build without those vars set still
// completes — they're read at request time on the browser instead.

'use client';

export const dynamic = 'force-dynamic';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase';
import { installCaptureHandlers } from '@/lib/capture-thumbnail';
import { endpoints } from '@/lib/endpoints';

interface LoginState {
  error: string | null;
}

const INITIAL: LoginState = { error: null };

// Action consumed by useActionState. Reads email/password from the form's
// FormData. On success, navigates via window.location (Supabase password
// sign-in doesn't redirect itself — the /auth/callback route is only for
// OAuth code exchange). On failure, returns an error to display inline.
async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email    = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  // Password sign-in completes here; redirect to root which dispatches
  // by role. The /auth/callback route is only for OAuth code exchange.
  window.location.href = '/';
  return { error: null };
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInWithPassword, INITIAL);

  // Thumbnail capture for the dashboard's project card.
  // Per the locked spec: capture once on sign-on (mount) + once on
  // sign-off / tab close. The production-environment login page IS the
  // deployed app's public face, so we tag the upload kind='production'
  // and the dashboard renders it next to the DevShell preview tile.
  // Only fires in production-tier deployments since preview-tier
  // visitors are normally the dev themselves; we don't want preview
  // login screens overwriting the production thumbnail.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production') return;
    return installCaptureHandlers({
      cactaiBase: endpoints.cactaiBase,
      projectId:  endpoints.projectId,
      kind:       'production',
    });
  }, []);

  // Google OAuth flow runs outside the password form. useTransition gives the
  // Google button its own pending indicator without conflating with the form's
  // pending state, and shares the inline error banner with the form via a
  // small piece of local state.
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthPending, startOauth]  = useTransition();

  function handleGoogleLogin() {
    startOauth(async () => {
      setOauthError(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setOauthError(error.message);
    });
  }

  const error      = state.error ?? oauthError;
  const anyPending = pending || oauthPending;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0A0A0F',
      fontFamily: 'Sora, system-ui, sans-serif',
    }}>
      <div
        className="cactai-skel-login-card"
        style={{
        background: '#13131F',
        border: '1px solid #1E1E2E',
        borderRadius: 16,
        padding: 40,
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <svg width="24" height="24" viewBox="0 0 100 100" fill="url(#login-g)">
            <defs>
              <linearGradient id="login-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFB44D"/>
                <stop offset="100%" stopColor="#9A3CFF"/>
              </linearGradient>
            </defs>
            <path d="M40 12 Q40 8 44 8 L56 8 Q60 8 60 12 L60 30 Q60 32 62 32 L72 32 Q78 32 78 38 Q78 50 78 58 Q78 62 74 62 L62 62 Q60 62 60 64 L60 86 Q60 92 54 92 L46 92 Q40 92 40 86 L40 70 Q40 68 38 68 L28 68 Q22 68 22 62 Q22 50 22 42 Q22 38 26 38 L38 38 Q40 38 40 36 Z"/>
          </svg>
          {/* App name comes from config — agent updates this */}
          <span style={{ fontWeight: 700, fontSize: 15, color: '#F5F5FA' }}>App</span>
        </div>

        <div style={{ fontSize: 13, color: '#8B8B9F' }}>Sign in to continue</div>

        {error && (
          <div className="cactai-skel-err" style={{ fontSize: 12.5, color: '#FF3C77', background: 'rgba(255,60,119,0.08)', borderRadius: 8, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="cactai-skel-input"
            style={inputStyle}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="cactai-skel-input"
            style={inputStyle}
          />
          <button type="submit" disabled={anyPending} className="cactai-skel-btn" style={primaryBtnStyle}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: '#1E1E2E' }}/>
          <span style={{ fontSize: 11, color: '#5A5A6E' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#1E1E2E' }}/>
        </div>

        <button onClick={handleGoogleLogin} disabled={anyPending} className="cactai-skel-btn-ghost" style={ghostBtnStyle}>
          {oauthPending ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <style jsx>{`
          .cactai-skel-login-card {
            animation: cactai-rise-spring var(--d-slow, 400ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
          }
          .cactai-skel-err {
            animation: cactai-shake var(--d-base, 250ms) var(--ease, cubic-bezier(0.22, 1, 0.36, 1));
          }
          .cactai-skel-input {
            transition:
              border-color var(--d-fast, 150ms) var(--ease, ease),
              box-shadow var(--d-fast, 150ms) var(--ease, ease);
          }
          .cactai-skel-input:focus,
          .cactai-skel-input:focus-visible {
            border-color: var(--c-accent, #FF4E6A);
            box-shadow: 0 0 0 3px rgba(255, 78, 106, 0.18);
            outline: none;
          }
          .cactai-skel-btn,
          .cactai-skel-btn-ghost {
            transition:
              transform var(--d-fast, 150ms) var(--ease, ease),
              filter var(--d-fast, 150ms) var(--ease, ease),
              box-shadow var(--d-fast, 150ms) var(--ease, ease);
          }
          .cactai-skel-btn:hover:not(:disabled),
          .cactai-skel-btn-ghost:hover:not(:disabled),
          .cactai-skel-btn:focus-visible:not(:disabled),
          .cactai-skel-btn-ghost:focus-visible:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.35);
            outline: none;
          }
          .cactai-skel-btn:active:not(:disabled),
          .cactai-skel-btn-ghost:active:not(:disabled) {
            transform: translateY(0);
            filter: brightness(1.05);
            transition-timing-function: var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
            transition-duration: var(--d-base, 250ms);
          }
          .cactai-skel-btn:disabled,
          .cactai-skel-btn-ghost:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1E1E2E',
  border: '1px solid #2A2A3D',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#F5F5FA',
  fontSize: 13.5,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,180,77,0.92) 0%, rgba(255,106,92,0.92) 40%, rgba(255,60,119,0.92) 75%, rgba(154,60,255,0.92) 100%)',
  border: '1px solid rgba(20,24,56,0.85)',
  borderRadius: 10,
  padding: '10px 16px',
  color: 'white',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #2A2A3D',
  borderRadius: 10,
  padding: '10px 16px',
  color: '#8B8B9F',
  fontSize: 13.5,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
