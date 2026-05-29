// src/app/operate/providers/page.tsx
//
// v1.3.5 2026-05-29 — Unified app-runtime provider configuration page.
//
// Single registry-projected surface for ALL providers the app might use at
// runtime (AI text + image gen + video gen + audio + 3D + character gen +
// mocap + NPC intelligence + synthetic data + etc.). Mirrors the
// AIProvisioning pattern from the platform dashboard but scoped to this
// deployed app's own BYOK blob — keys live on the developer's customer DB,
// encrypted with the shared SECRETS_ENCRYPTION_KEY.
//
// What it does:
//   - Reads PROVIDER_REGISTRY (from @cactai-io/types) to know which
//     providers + categories exist + what credential inputs each needs.
//   - Reads the current BYOK blob via /api/settings/byok to know which
//     providers have a key configured (presence + last-4 of envelope).
//   - Renders providers grouped by category, expandable sections.
//   - Provides per-provider credential editor → PATCH /api/settings/byok
//     (route encrypts before storing — see byok/route.ts:73-80).
//
// What it intentionally does NOT do (to keep scope tight):
//   - Per-tool provider override (that's the platform-side AIProvisioning
//     concern when running on behalf of a developer). The app uses
//     whatever provider is configured for a given capability.
//   - Token usage display (deferred — add later as a TokenUsageCard once
//     the customer-DB-side token tracker exists).
//   - Model selection per provider (the existing /operate/ai-configuration
//     page handles AI model tier; this page handles which providers are
//     configured at all).
//
// Auth: requireDevRole — same gate as the rest of /operate. Inside
// DevShell-handoff sessions, the dev role unlocks this page transparently.

import { requireDevRole } from '@/lib/auth';
import { ProvidersCatalogClient } from './ProvidersCatalog.client';
import type { JSX } from 'react';

export default async function OperateProvidersPage(): Promise<JSX.Element> {
  await requireDevRole();
  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        Providers
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
        Configure the providers your app uses at runtime. Keys live on your own
        Supabase instance (encrypted via the shared SECRETS_ENCRYPTION_KEY), not
        on Cactai's infrastructure. End-user BYOK keys (managed by app users
        themselves under their account settings) override these defaults
        per-user; the values here are the app's fallback when an end user
        hasn't supplied their own.
      </p>
      <ProvidersCatalogClient />
    </div>
  );
}
