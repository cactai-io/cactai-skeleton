// src/app/api/settings/collaborators/route.ts
// Manages app-side collaborators — users with role='collaborator' in platform_roles.
// Collaborators access DevShell at the same level as devs.
// (v1.2 commit-flow rebuild: there is no longer a DevShell merge-to-main
// affordance to gate behind a stricter check — both roles commit to dev
// through pending-edits and developers merge dev to main manually in GitHub.)
// Protected: dev only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

// GET returns every project member with DevShell access (role IN
// dev/collaborator). The DevShell settings panel renders the full list
// so the project owner sees themselves alongside any invited
// collaborators; granted_at maps to accepted_at because a
// platform_roles row only exists once the user has signed in for the
// first time (no separate pending-invitation table on the customer DB
// today). Shape matches @cactai-io/mui's CollaboratorRecord directly.
//
// Column note: platform_roles' timestamp column is `granted_at` (see
// 0001_initial.sql), NOT `created_at`. An earlier version of this
// route used `created_at` and 502'd every load with
// "column platform_roles.created_at does not exist".
export async function GET() {
  try {
    await requireDevRole();
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from('platform_roles')
      .select('user_id, role, granted_at, app_users(id, email, display_name)')
      .in('role', ['dev', 'collaborator'])
      .order('granted_at', { ascending: true });

    if (error) {
      return NextResponse.json({
        error:  'collaborators_load_failed',
        detail: error.message,
      }, { status: 502 });
    }

    interface CollaboratorRow {
      user_id:    string;
      role:       string;
      granted_at: string;
      app_users:  { id: string; email: string; display_name: string | null }
               | { id: string; email: string; display_name: string | null }[]
               | null;
    }
    const rows = (data ?? []) as unknown as CollaboratorRow[];

    const collaborators = rows.map((r) => {
      const appUser = Array.isArray(r.app_users) ? r.app_users[0] : r.app_users;
      const email   = appUser?.email ?? '';
      return {
        id:           r.user_id,
        // CollaboratorRecord's developer_id is the public-facing id;
        // for skeleton-side rows that's the same as the auth user id.
        developer_id: r.user_id,
        display_name: appUser?.display_name ?? email.split('@')[0] ?? '(unknown)',
        email,
        role:         r.role,
        // No separate invitation flow today — row existence is
        // acceptance, so accepted_at mirrors the role-grant timestamp.
        accepted_at:  r.granted_at,
        // Permissions surface — every role gets the same access today
        // (no per-row permission matrix yet). Returning the field
        // (rather than omitting it) keeps the panel's "Permissions"
        // section render path stable as soon as the matrix lands.
        permissions:  {
          code_tree:   ['read', 'write'],
          schema_tools: true,
          settings:    true,
        },
      };
    });

    return NextResponse.json({ collaborators });
  } catch (err) {
    return NextResponse.json({
      error:  'collaborators_internal',
      detail: err instanceof Error ? err.message : 'unknown',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') return NextResponse.json({ error: 'dev_only' }, { status: 403 });

    const { email } = await req.json() as { email: string };
    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

    const supabase = createServiceSupabaseClient();

    // Invite the user via Supabase Auth admin API.
    const { data: invite, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email);
    if (inviteErr || !invite?.user) {
      return NextResponse.json({ error: 'invite_failed', detail: inviteErr?.message }, { status: 502 });
    }

    // Upsert their app_users row (id comes from Supabase Auth).
    await supabase
      .from('app_users')
      .upsert({ id: invite.user.id, email }, { onConflict: 'id' });

    // Write collaborator role into platform_roles (correct table).
    const { error: roleErr } = await supabase
      .from('platform_roles')
      .upsert({ user_id: invite.user.id, role: 'collaborator' }, { onConflict: 'user_id' });

    if (roleErr) {
      return NextResponse.json({ error: 'role_assign_failed', detail: roleErr.message }, { status: 502 });
    }

    return NextResponse.json({ invited: invite.user.id, email });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
