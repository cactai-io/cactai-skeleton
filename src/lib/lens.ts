// src/lib/lens.ts
// Lens helpers shared by client and server. The lens is the active
// tenant-role view for an authenticated session — sourced from one of:
//
//   1. The X-Cactai-Lens request header (per-tab override; takes priority
//      when the user actually holds the requested role). Resolved in
//      supabase.server.ts:resolveEffectiveLens().
//   2. The Supabase JWT app_metadata.lens claim (the user's default).
//   3. The user's highest-ranked tenant role as a fallback.
//
// Role universe: data-driven from the customer DB's tenant_roles_catalog
// table (0006_role_catalog.sql). The skeleton's TypeScript type for a
// lens is `string` — runtime validation against the catalog is the
// authoritative gate. New roles added to the catalog appear in the
// avatar menu automatically without any code change.

import { createServerSupabaseClient } from './supabase.server';
import { createClient as createBrowserSupabaseClient } from './supabase';

/** Lens is just a string — validated at runtime against tenant_roles_catalog. */
export type Lens = string;

export interface CatalogRole {
  role:        string;
  label:       string;
  rank:        number;
  description: string | null;
}

/**
 * Read the full role catalog from the customer DB. Cached per-request via
 * the standard Supabase SSR client; safe to call multiple times in one
 * server render.
 *
 * Returns the legacy three-role list as a fallback if the catalog table
 * isn't reachable (e.g. fresh install before 0006 ran).
 */
export async function getRoleCatalog(): Promise<CatalogRole[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('tenant_roles_catalog')
      .select('role, label, rank, description')
      .order('rank', { ascending: false });
    if (error || !data || data.length === 0) {
      return LEGACY_CATALOG;
    }
    return data as CatalogRole[];
  } catch {
    return LEGACY_CATALOG;
  }
}

const LEGACY_CATALOG: CatalogRole[] = [
  { role: 'super_admin', label: 'Super-admin', rank: 2, description: null },
  { role: 'admin',       label: 'Admin',       rank: 1, description: null },
  { role: 'user',        label: 'User',        rank: 0, description: null },
];

/**
 * Validate that a candidate string is a real role in the current catalog.
 * Used by /api/lens to reject forged lens values.
 */
export async function isValidLens(candidate: string): Promise<boolean> {
  const catalog = await getRoleCatalog();
  return catalog.some(r => r.role === candidate);
}

/**
 * Server-side helper — read the active lens from the current session.
 * Returns null when the user has no tenant roles. Honors the per-request
 * header override when present and valid.
 *
 * Delegates to supabase.server.ts:resolveEffectiveLens(). Kept here for
 * backward compatibility with callers that imported from this module.
 */
export async function getActiveLens(): Promise<Lens | null> {
  const { resolveEffectiveLens } = await import('./supabase.server');
  return resolveEffectiveLens();
}

/**
 * Client-side helper — switch the active lens (mutating the JWT claim).
 *
 * This sets the DEFAULT lens for the user across all tabs that don't
 * carry their own X-Cactai-Lens override. For per-tab switching that
 * doesn't change the user-level default, use openLensTab() from
 * lens-tab.ts instead — it opens a new named tab with the lens scoped
 * to that tab only.
 *
 * Caller should re-fetch data or reload after this resolves so RLS-
 * scoped queries pick up the new claim.
 */
export async function switchLens(newLens: Lens): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/lens', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ lens: newLens }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({})) as { error?: string };
    return { ok: false, error: detail.error ?? `status_${res.status}` };
  }
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
