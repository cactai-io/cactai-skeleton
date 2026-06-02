// src/app/manage/layout.tsx
// Management panel layout. Renders the developer's brand-tokens shell with
// notification bell, avatar menu, and role-tab opening.
//
// Per locked decision: the preview-environment → /dev redirect is GONE.
// The management panel can be accessed on preview or production. In production it's
// the developer's primary landing; in preview it's available for dev
// testing against the dev-branch database.

import { requireManageRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import { getRoleCatalog } from '@/lib/lens';
import type { AppIdentity } from '@cactai-io/brand-tokens';
import { ManagementShellProvider } from './ManagementShellProvider';

export default async function OperateLayout({ children }: { children: React.ReactNode }) {
  const user    = await requireManageRole();
  const catalog = await getRoleCatalog();

  // Held roles intersected with catalog so the menu only shows lenses the
  // user can actually open.
  const catalogRoles = new Set(catalog.map(r => r.role));
  const availableRoles = Array.from(new Set(
    user.all_roles.map(r => r.role).filter(r => catalogRoles.has(r))
  )).map(role => {
    const meta = catalog.find(c => c.role === role);
    return { role, label: meta?.label ?? role };
  });

  // App identity comes from project_state.decisions.app_identity_v1 (set by
  // the wizard or management settings page).
  const supa = await createServerSupabaseClient();
  let appIdentity: Partial<AppIdentity> | null = null;
  try {
    const { data } = await supa
      .from('project_state')
      .select('decisions')
      .limit(1)
      .maybeSingle();
    const decisions = ((data as { decisions?: Record<string, unknown> } | null)?.decisions) ?? {};
    appIdentity = (decisions['app_identity_v1'] ?? null) as Partial<AppIdentity> | null;
  } catch {
    // No identity stored yet — provider uses fallbacks.
  }

  return (
    <ManagementShellProvider user={user} availableRoles={availableRoles} appIdentity={appIdentity}>
      {children}
    </ManagementShellProvider>
  );
}
