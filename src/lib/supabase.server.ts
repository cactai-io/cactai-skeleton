// src/lib/supabase.server.ts
// Server-side Supabase clients + lens resolution.
//
// resolveEffectiveLens() merges the per-request X-Cactai-Lens header (when
// present and valid) with the user's JWT app_metadata.lens claim. The
// header wins ONLY if the caller actually holds the requested lens in
// tenant_members — preventing privilege escalation via header forgery.
//
// applyLensToRpc() runs SELECT set_config('app.active_lens', $1, true) at
// the start of any transaction so RLS policies that read
// current_setting('app.active_lens', true) see the effective lens for
// the request. SET LOCAL is transaction-scoped; the pooler (PgBouncer in
// transaction mode) is compatible with set_config(..., true) which is
// the function-form equivalent.
//
// End-user behavior is preserved: when no header is sent, resolveEffectiveLens
// returns the JWT claim, and applyLensToRpc is a no-op.

import { endpoints } from './endpoints';
import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import type { Database } from './database.types';

const VALID_LENS_PATTERN = /^[a-zA-Z0-9_]{1,32}$/;

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    endpoints.supabaseUrl,
    endpoints.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies; ignored.
          }
        },
      },
    },
  );
}

export function createServiceSupabaseClient(): SupabaseClient<Database> {
  return createServerClient<Database>(
    endpoints.supabaseUrl,
    process.env.SUPABASE_SERVICE_KEY ?? '',
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false },
    },
  );
}

/**
 * Read the X-Cactai-Lens header from the current request, if any. Returns
 * null when missing or syntactically invalid.
 */
export async function getRequestLensHeader(): Promise<string | null> {
  try {
    const h        = await headers();
    const value    = h.get('x-cactai-lens');
    if (!value) return null;
    return VALID_LENS_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the effective lens for the current request.
 *
 * Order:
 *   0. PREVIEW BYPASS (Test Drive) — a developer (has a platform_roles row)
 *      may lens into ANY role in tenant_roles_catalog, because when they test-
 *      drive their own app they hold NO tenant_members roles. End-users never
 *      have a platform_roles row, so they can never trigger this — no
 *      escalation path. Fails CLOSED: if the caller isn't a developer or the
 *      role isn't in the catalog, it falls through to the normal checks below.
 *   1. X-Cactai-Lens header, validated against the user's actual
 *      tenant_members rows. Header wins if the user holds the role.
 *   2. JWT app_metadata.lens claim.
 *   3. The user's highest tenant role as a fallback (matches existing
 *      getActiveLens() behavior).
 *
 * Returns null when the user holds no tenant roles (and isn't a previewing dev).
 */
export async function resolveEffectiveLens(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const headerLens = await getRequestLensHeader();

  // 0. Preview bypass — developers only, any catalog role. See doc above.
  if (headerLens && await callerIsDeveloper(supabase, user.id)) {
    const { data: catRole } = await supabase
      .from('tenant_roles_catalog')
      .select('role')
      .eq('role', headerLens)
      .maybeSingle();
    if (catRole) return headerLens;
  }

  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const heldRoles = ((memberships ?? []) as Array<{ role: string }>).map(m => m.role);
  if (heldRoles.length === 0) return null;

  if (headerLens && heldRoles.includes(headerLens)) {
    return headerLens;
  }

  const claim = ((user.app_metadata as Record<string, unknown> | undefined)?.lens) as string | undefined;
  if (claim && heldRoles.includes(claim)) {
    return claim;
  }

  // Fall back to highest-ranked held role.
  // Rank table comes from the role catalog; if the catalog isn't reachable,
  // the legacy super_admin > admin > user ordering applies as a safety net.
  return await pickHighestRole(supabase, heldRoles);
}

async function pickHighestRole(
  supa: SupabaseClient<Database>,
  heldRoles: string[],
): Promise<string> {
  const { data } = await supa
    .from('tenant_roles_catalog')
    .select('role, rank')
    .in('role', heldRoles)
    .order('rank', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data && (data as { role?: string }).role) return (data as { role: string }).role;

  // Legacy fallback when the catalog isn't populated (e.g. fresh install
  // before 0006 has run, or query failed).
  const legacyRank: Record<string, number> = { user: 0, admin: 1, super_admin: 2 };
  let best = heldRoles[0]!;
  for (const r of heldRoles) {
    if ((legacyRank[r] ?? 0) > (legacyRank[best] ?? 0)) best = r;
  }
  return best;
}

/** True when the current user is a developer of this app — has a platform_roles
 *  row with role dev or collaborator. End-users NEVER have one, so this is the
 *  gate for the Test Drive preview-lens bypass in resolveEffectiveLens. Any
 *  error returns false (fails closed → no bypass). */
async function callerIsDeveloper(
  supa:   SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  try {
    const { data } = await supa
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['dev', 'collaborator'])
      .limit(1)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Apply the effective lens to the database session for the duration of
 * one query/transaction. Call this immediately before running a query
 * whose RLS depends on current_setting('app.active_lens', true).
 *
 * Uses set_config() with is_local=true; safe for pooled connections.
 */
export async function applyLensToRpc(
  supa: SupabaseClient<Database>,
  lens: string | null,
): Promise<void> {
  if (!lens) return;
  // Supabase JS doesn't expose raw SQL execution outside RPC; the convention
  // is a stored function 'set_active_lens(text)' that wraps the set_config
  // call. If the function isn't present (older customer DBs), this is a
  // no-op fallback — RLS still reads the JWT claim and queries work, just
  // without per-tab override.
  try {
    await supa.rpc('set_active_lens' as never, { lens } as never);
  } catch {
    // Silent — older installs without the helper function fall back to
    // JWT-claim behavior.
  }
}
