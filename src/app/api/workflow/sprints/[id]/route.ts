// src/app/api/workflow/sprints/[id]/route.ts
//
// Sprint metadata mutation. Intentionally narrow surface:
//   PATCH  /api/workflow/sprints/[id]
//     Body: { name?, goal?, definition_of_done? }
//     Updates only sprint-level metadata. Does NOT accept a tasks array
//     — adding or removing tasks bypasses the planner's dependency
//     analysis and the agent's task-type tier resolution, so it has to
//     go through sprint:refine (re-runs the AI planner) instead.
//
//   DELETE /api/workflow/sprints/[id]
//     Hard delete. Removes the dev_sprints row + its dev_sprint_goals
//     children (FK cascade). If this is the active sprint in
//     project_state.sprint_cycle.current_sprint, the runtime state is
//     also cleared and current_state moves back to 'idle'. Refuses to
//     delete a sprint with status='active' to prevent ripping the
//     executor's footing out from under it mid-run.
//
// Protected: dev/collaborator.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireDevRole();
    const projectId = endpoints.projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'project_id_missing' }, { status: 400 });
    }

    const body = await req.json().catch(() => null) as {
      name?:               string;
      goal?:               string;
      definition_of_done?: string;
    } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      patch.name = body.name.trim();
    }
    if (typeof body.goal === 'string') {
      patch.goal = body.goal;
    }
    if (typeof body.definition_of_done === 'string') {
      patch.definition_of_done = body.definition_of_done;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('dev_sprints')
      .update(patch)
      .eq('id', id)
      .eq('project_id', projectId)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 502 });
    }

    // Mirror into project_state.sprint_cycle.current_sprint when this
    // is the live sprint, so the executor + the polling shape both
    // reflect the edit immediately.
    try {
      const { data: ps } = await supabase
        .from('project_state')
        .select('sprint_cycle')
        .eq('project_id', projectId)
        .maybeSingle();
      const sc = (ps?.sprint_cycle ?? {}) as { current_sprint?: { id?: string } };
      if (sc.current_sprint && sc.current_sprint.id === id) {
        await supabase
          .from('project_state')
          .upsert({
            project_id: projectId,
            sprint_cycle: { ...sc, current_sprint: { ...sc.current_sprint, ...patch } },
          });
      }
    } catch {
      // Non-fatal — the dev_sprints update is the source of truth for
      // anything reading via /api/workflow/state.
    }

    return NextResponse.json({ sprint: data });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireDevRole();
    const projectId = endpoints.projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'project_id_missing' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Refuse to delete a sprint that's currently executing. Cancel
    // (sprint:cancel event in the orchestrator) is the right path for
    // stopping a running sprint; delete is meant for cleaning up
    // planned-but-discarded or completed history entries.
    const { data: sprint } = await supabase
      .from('dev_sprints')
      .select('status')
      .eq('id', id)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!sprint) {
      return NextResponse.json({ error: 'sprint_not_found' }, { status: 404 });
    }
    if (sprint.status === 'active') {
      return NextResponse.json({
        error:  'cannot_delete_active_sprint',
        detail: 'Cancel the sprint first (sets status to abandoned), then delete.',
      }, { status: 409 });
    }

    const { error } = await supabase
      .from('dev_sprints')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);
    if (error) {
      return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 502 });
    }

    // Clear current_sprint from runtime state if this was it.
    try {
      const { data: ps } = await supabase
        .from('project_state')
        .select('sprint_cycle')
        .eq('project_id', projectId)
        .maybeSingle();
      const sc = (ps?.sprint_cycle ?? {}) as { current_sprint?: { id?: string }; current_state?: string };
      if (sc.current_sprint?.id === id) {
        await supabase
          .from('project_state')
          .upsert({
            project_id: projectId,
            sprint_cycle: { ...sc, current_sprint: undefined, current_state: 'idle' },
          });
      }
    } catch {
      // Non-fatal.
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
