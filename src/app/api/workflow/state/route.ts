// src/app/api/workflow/state/route.ts
// Reads workflow state (current step, decisions, sprints, backlog) directly
// from the developer's own Supabase using the service-role key. Workflow
// data lives where the developer can see it — never in Cactai's database.
//
// Called by DevShellProvider on mount and after each form submission.
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function GET() {
  try {
    await requireDevRole();

    const projectId = endpoints.projectId;
    if (!projectId) {
      return NextResponse.json({
        workflow_step: 'name_and_intent',
        decisions: {},
        backlog: [],
        sprints: [],
      });
    }

    const supabase = createServiceSupabaseClient();

    // project_state row — created on demand if missing.
    let { data: state } = await supabase
      .from('project_state')
      .select('workflow_step, decisions, roles_config, is_multi_tenant, skeleton_pushed')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!state) {
      const { data: created } = await supabase
        .from('project_state')
        .insert({ project_id: projectId })
        .select('workflow_step, decisions, roles_config, is_multi_tenant, skeleton_pushed')
        .single();
      state = created;
    }

    const { data: backlog } = await supabase
      .from('dev_goal_backlog')
      .select('*')
      .eq('project_id', projectId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    const { data: sprints } = await supabase
      .from('dev_sprints')
      .select(`
        id, name, status, definition_of_done, dev_branch_commit, main_merge_commit,
        vercel_preview_url, started_at, completed_at, created_at, updated_at,
        goals:dev_sprint_goals(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Top-rank role name from tenant_roles_catalog. Used by the
    // WorkflowCompletionModal's conditional auto-promote callout so the
    // copy reads "first signup is granted the <role>" with whatever the
    // developer renamed the role to (super_admin / admin / captain /
    // whatever). Falls back to null when no catalog rows exist.
    let topRankRoleName: string | null = null;
    try {
      const { data: catalog } = await supabase
        .from('tenant_roles_catalog')
        .select('role, rank, is_default')
        .order('rank', { ascending: false })
        .order('is_default', { ascending: false })
        .limit(1);
      if (catalog && catalog.length > 0) {
        const r = catalog[0] as { role?: string };
        if (typeof r.role === 'string') topRankRoleName = r.role;
      }
    } catch {
      // Catalog table may not exist yet on a partially-migrated project.
    }

    // Auto-promote fires whenever the app supports multi-tenant signup
    // (Instagram + HubSpot models per role+access architecture). Read
    // the signup mode from decisions; both multi_user_* modes auto-
    // promote the first signup in their tenant.
    const decisions = (state?.decisions ?? {}) as Record<string, unknown>;
    const signupMode = typeof decisions['signup_mode_v1'] === 'string'
      ? decisions['signup_mode_v1']
      : 'multi_user_single_workspace';
    const autoPromoteOnFirstSignup =
      signupMode === 'multi_user_single_workspace' ||
      signupMode === 'multi_user_multi_workspace';

    return NextResponse.json({
      workflow_step:              state?.workflow_step ?? 'name_and_intent',
      decisions:                  decisions,
      roles_config:               state?.roles_config ?? {},
      is_multi_tenant:            state?.is_multi_tenant ?? false,
      skeleton_pushed:            state?.skeleton_pushed ?? false,
      backlog:                    backlog ?? [],
      sprints:                    sprints ?? [],
      top_rank_role_name:         topRankRoleName,
      auto_promote_on_first_signup: autoPromoteOnFirstSignup,
    });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
