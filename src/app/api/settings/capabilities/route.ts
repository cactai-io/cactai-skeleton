// src/app/api/settings/capabilities/route.ts
// v1.2 Thread 06 — tool/skill availability configuration for this project.
//
// Two scopes:
//   - 'appshell' — affects the deployed app
//   - 'devshell' — affects the IDE experience for this project
//
// The skeleton owns the per-project config (stored in project_state.decisions
// on the developer's own Supabase). The catalogue (universe of tools and
// skills) is fetched from the platform via /v1/catalogue and merged into
// the response. Splitting the two means the skeleton can render the
// availability list even when the developer is offline from the platform's
// catalogue updates — only new tools/skills won't appear.
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import {
  loadCapabilityConfig,
  saveCapabilityConfig,
  EMPTY_CAPABILITY_CONFIG,
} from '@/lib/projectDecisions.server';
import type {
  CapabilityCatalogueItem,
  CapabilityConfig,
  CapabilityConfigPatch,
  CapabilityConfigResponse,
  CapabilityScopeConfig,
} from '@cactai-io/types';

// GET — return the catalogue + the project's per-scope config.
export async function GET() {
  try {
    await requireDevRole();

    const catalogue = await fetchPlatformCatalogue();
    const config    = await loadCapabilityConfig();

    const body: CapabilityConfigResponse = { catalogue, config };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'capabilities_load_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// PATCH — apply one minimal change to the project's config.
//
// We deliberately accept atomic deltas rather than the whole config so
// the UI's "loading on the affected row" pattern works without races.
// Two simultaneous PATCHes setting different rows merge correctly because
// each PATCH is a read-modify-write against the same row.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }

    const patch = (await req.json()) as CapabilityConfigPatch;
    if (!patch || !patch.scope || (patch.scope !== 'appshell' && patch.scope !== 'devshell')) {
      return NextResponse.json({ error: 'invalid_scope' }, { status: 400 });
    }

    // Devshell never hides anything from itself — only the appshell scope
    // accepts `enabled: false`. The Thread 06 prompt is explicit about this:
    // DevShell always shows what's available. We accept the patch in either
    // direction but the appshell-only "hide" semantic is enforced server-side
    // by reading the scope before deciding what `enabled: false` means in
    // the UI ("hidden" vs "off by default"). The bool itself is the same.

    const config = await loadCapabilityConfig();
    const scope  = config[patch.scope];

    if (patch.set_enabled) {
      scope.enabled = { ...scope.enabled, [patch.set_enabled.id]: patch.set_enabled.enabled };
    }
    if (patch.set_default) {
      scope.defaults_by_category = {
        ...scope.defaults_by_category,
        [patch.set_default.category]: patch.set_default.id,
      };
    }
    // v1.3.5 — Per-category priority chain (DevShell routing UI).
    if (patch.set_priority) {
      scope.priority_by_category = {
        ...(scope.priority_by_category ?? {}),
        [patch.set_priority.category]: patch.set_priority.ordered_provider_ids,
      };
    }
    // v1.3.5 — Per-tool provider override (management-panel routing UI).
    // Empty provider_id clears the override.
    if (patch.set_tool_override) {
      const next = { ...(scope.tool_overrides ?? {}) };
      if (patch.set_tool_override.provider_id) {
        next[patch.set_tool_override.tool_id] = patch.set_tool_override.provider_id;
      } else {
        delete next[patch.set_tool_override.tool_id];
      }
      scope.tool_overrides = next;
    }
    if (patch.reset_to_defaults) {
      const empty: CapabilityScopeConfig = { enabled: {}, defaults_by_category: {} };
      config[patch.scope] = empty;
    }

    await saveCapabilityConfig(config);

    // v1.3.5 2026-05-29 — Push cache invalidation to the platform so the
    // 60s-TTL routing snapshot is replaced with fresh data on the very
    // next turn. Fire-and-forget: a failed invalidation just means the
    // platform's cache TTL takes over, which is the pre-2026-05-29
    // behaviour and still correct (just slower to react).
    void invalidatePlatformRoutingSnapshot(patch.scope).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('[capabilities] routing invalidation push failed; cache will catch up on TTL', err);
    });

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    return NextResponse.json(
      { error: 'capabilities_update_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// v1.3.5 2026-05-29 — Notify the platform to drop its in-memory routing
// snapshot cache entry for this project + shell, so the next turn loads
// the freshly-written capability_config_v2 instead of waiting for the
// 60s TTL to expire. Paired with /v1/internal/routing/invalidate on the
// platform side. Silent on every failure — the platform cache TTL is the
// floor; this is just a "wake up early" signal.
async function invalidatePlatformRoutingSnapshot(scope: 'devshell' | 'appshell'): Promise<void> {
  const apiKey  = endpoints.cactaiApiKey;
  const baseUrl = endpoints.cactaiBase;
  const projectId = endpoints.projectId;
  if (!apiKey || !baseUrl || !projectId) return;
  const res = await fetch(`${baseUrl}/v1/internal/routing/invalidate`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ project_id: projectId, shell: scope }),
  });
  if (!res.ok) {
    throw new Error(`platform invalidate failed: HTTP ${res.status}`);
  }
}

// Fetch the catalogue from the platform. The CACTAI_API_KEY scopes the
// catalogue to this project's developer's tier, which is how paid-vs-free
// gating is enforced. When the call fails we return an empty catalogue —
// the UI shows "no capabilities" rather than crashing, and the developer
// can see the failure in the network panel.
async function fetchPlatformCatalogue(): Promise<CapabilityCatalogueItem[]> {
  const apiKey  = endpoints.cactaiApiKey;
  const baseUrl = endpoints.cactaiBase;
  if (!apiKey) return [];

  const res = await fetch(`${baseUrl}/v1/catalogue`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    // Catalogue rarely changes within a session. Allow a short cache so the
    // settings panel doesn't hit the platform on every PATCH round-trip.
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    tools?:  CapabilityCatalogueItem[];
    skills?: CapabilityCatalogueItem[];
  };
  return [...(data.tools ?? []), ...(data.skills ?? [])];
}

// v1.3.5 — Next 15 enforces that route files only export the HTTP-method
// handlers (GET, POST, etc.) and a fixed set of segment-config fields.
// Re-exports of arbitrary symbols are rejected during the route-type
// validation pass. Tests should import EMPTY_CAPABILITY_CONFIG and
// CapabilityConfig directly from @cactai-io/types where they originate.
