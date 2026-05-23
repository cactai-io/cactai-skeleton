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

export async function GET() {
  try {
    await requireDevRole();
    const supabase = createServiceSupabaseClient();

    // platform_roles holds dev/collaborator roles; join app_users for display info.
    const { data, error } = await supabase
      .from('platform_roles')
      .select('user_id, role, created_at, app_users(id, email, display_name)')
      .eq('role', 'collaborator');

    if (error) return NextResponse.json({ collaborators: [] });

    // Supabase types joined relations as arrays unless the relation is 1:1
    // and the FK is a unique constraint. We cast to the runtime shape we know
    // is returned (a single row per platform_roles entry).
    interface CollaboratorRow {
      user_id: string;
      role: string;
      created_at: string;
      app_users: { id: string; email: string; display_name: string | null } | { id: string; email: string; display_name: string | null }[] | null;
    }
    const rows = (data ?? []) as unknown as CollaboratorRow[];

    const collaborators = rows.map((r) => {
      // app_users may be returned as an object or single-element array depending
      // on Supabase relation metadata. Normalise to the first entry.
      const appUser = Array.isArray(r.app_users) ? r.app_users[0] : r.app_users;
      return {
        id:           r.user_id,
        email:        appUser?.email ?? '',
        display_name: appUser?.display_name ?? null,
        role:         r.role,
        created_at:   r.created_at,
      };
    });

    return NextResponse.json({ collaborators });
  } catch {
    return NextResponse.json({ collaborators: [] });
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
