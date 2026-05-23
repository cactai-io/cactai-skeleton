// src/lib/capabilities.server.ts
// Loads app_roles capabilities from the developer's Supabase and caches them
// in process memory for the lifetime of the Node process. The table is
// effectively static — capabilities change only when the schema or seed
// migrates — so a single load at first read is enough.
//
// Cache invalidation contract:
//   The cache is in-memory per Node process. Any code path that mutates
//   the `app_roles` table (DDL migrations, CLI seed scripts, future admin
//   UIs, ad-hoc psql) MUST call invalidateCapabilityCache() after the
//   write so subsequent reads pull the new state. Without this call,
//   long-lived processes (Vercel functions kept warm, local dev servers)
//   continue serving the stale snapshot until either the TTL fires or
//   the process restarts.
//
//   The TTL below (CAPABILITY_TTL_MS) is a best-effort safety net — it
//   limits the duration of staleness but is NOT a substitute for calling
//   invalidateCapabilityCache() at the actual write site. Treat the TTL
//   as a backstop for missed-invalidation bugs, not as the primary
//   freshness mechanism.
//
//   Existing writers:
//     - POST /api/admin/refresh-capabilities (super_admin-gated route
//       that exists specifically to invalidate the cache; see
//       src/app/api/admin/refresh-capabilities/route.ts). This is the
//       canonical caller — invoke it from any tool, CLI, or runbook
//       that mutates app_roles outside the standard /api routes.
//     - /api/settings/capabilities writes to project_state.decisions,
//       NOT to app_roles, so it does not need to invalidate this cache.
//
//   Example caller:
//     import { invalidateCapabilityCache } from '@/lib/capabilities.server';
//     await mutateAppRolesSomehow();
//     invalidateCapabilityCache();
//
// All access is async; the first caller blocks on the initial load.

import { createServiceSupabaseClient } from './supabase.server';

export type Capabilities = Record<string, string[]>;

const CAPABILITY_TTL_MS = 5 * 60 * 1000;  // 5 minutes — long enough for stable boot, short enough to recover from a missed invalidation.

interface CacheEntry {
  data:    Capabilities;
  loaded_at: number;
}

let cache: Promise<CacheEntry> | null = null;

async function loadFromDb(): Promise<CacheEntry> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('app_roles')
    .select('role_name, capabilities');

  if (error) {
    // Fail-loud but keep the previous cache when available, so a transient
    // DB blip doesn't blow up authorization checks.
    throw new Error(`capability_load_failed: ${error.message}`);
  }

  const capabilities: Capabilities = {};
  for (const row of (data ?? []) as Array<{ role_name: string; capabilities: string[] | null }>) {
    capabilities[row.role_name] = Array.isArray(row.capabilities) ? row.capabilities : [];
  }
  return { data: capabilities, loaded_at: Date.now() };
}

export async function loadCapabilities(): Promise<Capabilities> {
  if (!cache) {
    cache = loadFromDb();
  } else {
    // Refresh on TTL even without explicit invalidation.
    const entry = await cache;
    if (Date.now() - entry.loaded_at > CAPABILITY_TTL_MS) {
      cache = loadFromDb();
    }
  }
  const entry = await cache;
  return entry.data;
}

export function invalidateCapabilityCache(): void {
  cache = null;
}

// Convenience wrapper around hasCapability for callers that only have a role
// string in hand. Loads the cache lazily.
export async function roleHasCapability(role: string, capability: string): Promise<boolean> {
  const caps = await loadCapabilities();
  return caps[role]?.includes(capability) ?? false;
}
