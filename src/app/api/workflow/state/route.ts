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

    return NextResponse.json({
      workflow_step: state?.workflow_step ?? 'name_and_intent',
      decisions:       state?.decisions ?? {},
      roles_config:    state?.roles_config ?? {},
      is_multi_tenant: state?.is_multi_tenant ?? false,
      skeleton_pushed: state?.skeleton_pushed ?? false,
      backlog:         backlog ?? [],
      sprints:         sprints ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
