// src/app/api/workflow/sprints/[id]/tasks/[task_id]/route.ts
//
// Per-task field updates within the current sprint's task list.
//   PATCH  /api/workflow/sprints/[id]/tasks/[task_id]
//     Body: { title?, description?, acceptance_criteria? }
//     Updates only descriptive fields on a single task. Does NOT change:
//       - task list membership (add/remove)
//       - task dependencies (those are the planner's structural call)
//       - tier_override (the existing sprint:set_tier event handles this)
//       - status / completed_at / branch_name (those are executor-owned)
//     Use sprint:refine in the chat to ask the AI to re-plan when you
//     want to add or remove tasks — that keeps the dependency graph
//     consistent and the task_type tier resolution coherent.
//
//   Refuses to edit tasks while their sprint is status='active' (the
//   executor may be mid-dispatch). Cancel + edit + restart is the
//   intended flow.
//
// Storage shape: tasks live in project_state.sprint_cycle.current_sprint
// .tasks as JSONB. This route reads + writes that array. The
// dev_sprint_goals Postgres table is the simpler summary used by the
// polling endpoint; it doesn't carry acceptance_criteria, so the JSONB
// shape is the canonical place for those.
//
// Protected: dev/collaborator.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

interface TaskShape {
  id?:                  string;
  title?:               string;
  description?:         string;
  acceptance_criteria?: string[];
  status?:              string;
  [k: string]:          unknown;
}

interface CurrentSprint {
  id?:    string;
  tasks?: TaskShape[];
  [k: string]: unknown;
}

interface SprintCycleState {
  current_sprint?: CurrentSprint;
  current_state?:  string;
  [k: string]:     unknown;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; task_id: string }> },
) {
  try {
    const { id, task_id } = await params;
    await requireDevRole();
    const projectId = endpoints.projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'project_id_missing' }, { status: 400 });
    }

    const body = await req.json().catch(() => null) as {
      title?:               string;
      description?:         string;
      acceptance_criteria?: string[];
    } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { data: ps, error: readErr } = await supabase
      .from('project_state')
      .select('sprint_cycle')
      .eq('project_id', projectId)
      .maybeSingle();
    if (readErr) {
      return NextResponse.json({ error: 'state_read_failed', detail: readErr.message }, { status: 502 });
    }

    const sc = (ps?.sprint_cycle ?? {}) as SprintCycleState;
    if (!sc.current_sprint || sc.current_sprint.id !== id) {
      return NextResponse.json({
        error:  'sprint_not_current',
        detail: 'Task edits are only supported on the active or planning sprint. Completed sprints are read-only.',
      }, { status: 409 });
    }
    if (sc.current_state === 'sprint_active') {
      return NextResponse.json({
        error:  'sprint_in_progress',
        detail: 'Cancel the active sprint before editing task contents, then approve again to resume dispatch with the updated tasks.',
      }, { status: 409 });
    }

    const tasks = Array.isArray(sc.current_sprint.tasks) ? sc.current_sprint.tasks : [];
    const idx   = tasks.findIndex(t => t.id === task_id);
    if (idx === -1) {
      return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
    }

    const patched: TaskShape = { ...tasks[idx] };
    if (typeof body.title === 'string' && body.title.trim().length > 0) {
      patched.title = body.title.trim();
    }
    if (typeof body.description === 'string') {
      patched.description = body.description;
    }
    if (Array.isArray(body.acceptance_criteria)) {
      patched.acceptance_criteria = body.acceptance_criteria.filter(c => typeof c === 'string');
    }

    const nextTasks = tasks.slice();
    nextTasks[idx] = patched;
    const nextSprint: CurrentSprint = { ...sc.current_sprint, tasks: nextTasks };
    const nextCycle:  SprintCycleState = { ...sc, current_sprint: nextSprint };

    const { error: writeErr } = await supabase
      .from('project_state')
      .upsert({ project_id: projectId, sprint_cycle: nextCycle });
    if (writeErr) {
      return NextResponse.json({ error: 'state_write_failed', detail: writeErr.message }, { status: 502 });
    }

    return NextResponse.json({ task: patched });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
