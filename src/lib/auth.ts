// src/lib/auth.ts
// Authentication and role detection helpers.
//
// Role architecture (two layers):
//   Platform roles — dev, collaborator. Live in platform_roles table.
//     Set by the developer's own seed; identifies who built the app.
//   Tenant roles   — data-driven via tenant_roles_catalog. Live in
//     tenant_members. App users hold one or more of these on one or more
//     tenants. The catalog ships with super_admin/admin/user seeded; the
//     developer can add more via migration files.
//
// Active lens (replaces the v1.1 view_as_role cookie):
//   Every authenticated session has a single active lens, drawn from the
//   user's tenant_members rows. The lens lives in the Supabase JWT
//   app_metadata.lens claim by default. Per-tab overrides arrive via the
//   X-Cactai-Lens header and are validated by supabase.server.ts.
//
// Type safety note: TenantRole is `string` because the role universe is
// data-driven. Runtime validation against tenant_roles_catalog is the
// authoritative gate. Compile-time exhaustiveness checks are lost; the
// trade is that the developer can add new roles without code edits.

import { createServerSupabaseClient, resolveEffectiveLens } from './supabase.server';
import { redirect } from 'next/navigation';

export type PlatformRole = 'dev' | 'collaborator';
export type TenantRole   = string; // validated against tenant_roles_catalog
export type AppRole      = PlatformRole | TenantRole;

export interface SessionUser {
  id:              string;
  email:           string;
  /** The effective lens for this request — header override or JWT claim. */
  active_lens:     TenantRole | null;
  platform_role:   PlatformRole | null;
  /** Tenant_id this user is currently scoped to, resolved from the
   *  active lens. */
  tenant_id:       string | null;
  all_roles:       Array<{ role: AppRole; tenant_id: string | null }>;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: platformRows } = await supabase
    .from('platform_roles')
    .select('role')
    .eq('user_id', user.id);

  const platformRole: PlatformRole | null = platformRows && platformRows.length > 0
    ? (platformRows[0] as { role: string }).role as PlatformRole
    : null;

  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const tenantMemberships = (memberships ?? []) as Array<{ role: string; tenant_id: string }>;

  // Effective lens incorporates the per-request header override.
  const activeLens = await resolveEffectiveLens();

  // Tenant_id is the tenant_members row that matches the active lens.
  // When multiple memberships use the same role (rare today, but possible
  // post-multi-tenant), we pick the first; explicit tenant selection is
  // a future concern.
  const activeTenantId = activeLens
    ? (tenantMemberships.find(m => m.role === activeLens)?.tenant_id ?? null)
    : null;

  const allRoles: Array<{ role: AppRole; tenant_id: string | null }> = [
    ...(platformRows ?? []).map((r: { role: string }) => ({ role: r.role as AppRole, tenant_id: null })),
    ...tenantMemberships.map(m => ({ role: m.role as AppRole, tenant_id: m.tenant_id })),
  ];

  // A user with neither platform_roles nor tenant_members is not a valid
  // app user. Fail closed.
  if (!platformRole && tenantMemberships.length === 0) return null;

  return {
    id:            user.id,
    email:         user.email ?? '',
    active_lens:   activeLens,
    platform_role: platformRole,
    tenant_id:     activeTenantId,
    all_roles:     allRoles,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/auth/login');
  return user;
}

export async function requireDevRole(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.platform_role !== 'dev' && user.platform_role !== 'collaborator') {
    redirect('/app');
  }
  return user;
}

// Developers freely access /app — they hold tenant_members rows on the
// default tenant and ARE app users for their own app.
export async function requireAppRole(): Promise<SessionUser> {
  return requireAuth();
}

// /manage is only for dev role, on production deployments. Used to manage
// customer accounts (suspend, reset password, etc.) — separate from the
// developer's own access to /app via tenant_members rows.
export async function requireManageRole(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.platform_role !== 'dev') redirect('/app');
  return user;
}

export function getPostLoginRedirect(user: SessionUser): string {
  if (user.platform_role === 'dev' || user.platform_role === 'collaborator') {
    // Production devs land on /manage. Preview-side devs land on /dev.
    // Per-tab lens switching from either surface opens new lens tabs.
    const isProduction = process.env.VERCEL_ENV === 'production';
    return isProduction ? '/manage' : '/dev';
  }
  return '/app';
}

export function hasCapability(
  role: AppRole,
  capability: string,
  capabilities: Record<string, string[]>,
): boolean {
  return capabilities[role]?.includes(capability) ?? false;
}
