// src/app/app/byok-settings/page.tsx
//
// v1.3.5 Build 3 — End-user BYOK settings (R6).
//
// The deployed-app end-user mirror of the dashboard AI provisioning
// page. End users who have their own provider keys ("BYOK") manage
// THEM here — view configured providers, see token consumption against
// each key, register an authorized fallback ("use this when my primary
// is unavailable"). Limits/alerts (token-budget caps, monthly spend
// limits) are end-user-controlled (R6) and will ship in v2; this
// surface displays the data those limits will gate on.
//
// Auth: any signed-in end user. Storage of the underlying keys lives in
// user_api_keys on the deployed app's customer DB (encrypted via
// GAS_ENCRYPTION_KEY) — written via the auth:store_api_key tool
// invoked from chat or via this page's "Add key" flow.

import { requireAuth } from '@/lib/auth';
import { TokenUsagePanel } from './TokenUsagePanel.client';
import { EmbeddingsLine } from './EmbeddingsLine.client';

export default async function ByokSettingsPage() {
  const session = await requireAuth();

  return (
    <div style={{ padding: 40, maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
        AI provider keys
      </h1>
      <p style={{ color: '#8B8B9F', fontSize: 14, marginBottom: 24 }}>
        Bring your own provider keys to track costs against your own account.
        Keys are encrypted at rest. The app falls back to the developer's
        configured provider when you haven't supplied your own. Token usage
        against your keys appears below; limits and alerts ship in a later
        release.
      </p>

      <div style={{
        background: 'rgba(0, 214, 143, 0.06)',
        border:     '1px solid rgba(0, 214, 143, 0.18)',
        borderRadius: 12, padding: 16, fontSize: 13, color: '#9AE0C1',
        marginBottom: 24,
      }}>
        <strong>Signed in as:</strong>{' '}
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{session.id}</span>
        <br/>
        <strong>How limits work:</strong> the developer of this app meters Cactai
        server usage against their plan. Your provider tokens are billed by your
        provider directly. v2 will let you set spend alerts on your own keys.
      </div>

      <TokenUsagePanel />
      <EmbeddingsLine />
    </div>
  );
}
