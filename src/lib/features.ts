// src/lib/features.ts
// App-wide feature flags — the runtime store behind the prune/flag model.
//
// Each prunable-but-KEPT capability declares an entry below and places a gate
// (`featureEnabled('key')`) at its wiring point. The flag's VALUE lives in the
// app_feature_flags table (customer DB, written by App Configuration via the
// platform service-role) so the developer can toggle a capability on/off with
// no rebuild. The gate is "inside the file"; the value is the runtime store.
//
// REMOVE (prune) deletes a capability's `files`, its gate, and its row.
// KEEP leaves the gate in place; the flag (default off for an unused option)
// controls it. A missing row falls back to `default` so the app never breaks
// when a row hasn't been written yet.

import { createServerSupabaseClient } from '@/lib/supabase.server';

export interface FeatureFlagDef {
  /** Stable key: app_feature_flags.flag_key + the argument to featureEnabled(). */
  key: string;
  /** Label for the App Configuration controller. */
  label: string;
  /** Ship state when no DB row exists. */
  default: boolean;
  /**
   * Can the developer REMOVE (prune) this at build, or is it FLAG-ONLY?
   * - true  → prunable: gets the Build-It Keep/Remove choice; Remove deletes `files`.
   * - false → flag-only: always ships, toggle on/off only, NEVER deleted
   *   (too core/woven to delete safely — e.g. auth, AI/BYOK, MCP).
   */
  removable: boolean;
  /** Files the prune deletes when REMOVED — only meaningful when removable. */
  files?: string[];
  /** Other flag keys this capability requires; if a dep is off, treat this as off. */
  deps?: string[];
  /** App Configuration tab hosting this flag's toggle controller. */
  controllerTab?: string;
}

// The feature registry = the declaration BOTH the runtime gating (here) and the
// platform prune executor read. SINGLE SOURCE = feature-registry.json (committed
// + machine-readable so the platform reads it from the repo without parsing TS).
// Add a capability by adding an entry there.
import registryData from './feature-registry.json';

export const FEATURE_FLAGS: Record<string, FeatureFlagDef> = Object.fromEntries(
  (registryData as FeatureFlagDef[]).map(def => [def.key, def]),
);

interface FlagCache { value: Record<string, boolean>; at: number; }
let cache: FlagCache | null = null;
const TTL_MS = 30_000;

// One read populates every flag; app-wide values are identical for all users,
// so a short module-level cache is safe and keeps gates cheap.
async function loadFlags(): Promise<Record<string, boolean>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const map: Record<string, boolean> = {};
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from('app_feature_flags').select('flag_key, enabled');
    for (const row of data ?? []) map[row.flag_key as string] = row.enabled as boolean;
  } catch {
    // Read failure (e.g. no auth context) → fall back to registry defaults.
  }
  cache = { value: map, at: Date.now() };
  return map;
}

function resolve(key: string, flags: Record<string, boolean>): boolean {
  const value = key in flags ? flags[key]! : (FEATURE_FLAGS[key]?.default ?? false);
  if (!value) return false;
  // A capability is off if any dependency is off.
  for (const dep of FEATURE_FLAGS[key]?.deps ?? []) {
    if (!resolve(dep, flags)) return false;
  }
  return true;
}

export async function featureEnabled(key: string): Promise<boolean> {
  return resolve(key, await loadFlags());
}

export async function allFeaturesEnabled(): Promise<Record<string, boolean>> {
  const flags = await loadFlags();
  const out: Record<string, boolean> = {};
  for (const key of Object.keys(FEATURE_FLAGS)) out[key] = resolve(key, flags);
  return out;
}
