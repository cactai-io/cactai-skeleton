// src/app/api/workflow/backlog/route.ts
// Backlog collection routes.
//   GET    → list unresolved entries (same shape /api/workflow/state
//            returns; provided here for parity with PATCH/DELETE on the
//            [id] route).
//   POST   { description, source?, depends_on_decisions?,
//            source_thread_id? } → create a new backlog entry. source
//            defaults to 'developer_added' since the UI-driven path is
//            an explicit add by the developer (vs the agent's
//            add_to_backlog tool which sets 'agent_suggested' /
//            'tangent_capture' etc).
//
// Protected: dev/collaborator.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function GET() {
  try {
    await requireDevRole();
    const projectId = endpoints.projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'project_id_missing' }, { status: 400 });
    }
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('dev_goal_backlog')
      .select('*')
      .eq('project_id', projectId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'query_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ backlog: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireDevRole();
    const projectId = endpoints.projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'project_id_missing' }, { status: 400 });
    }

    const body = await req.json().catch(() => null) as {
      description?:          string;
      source?:               'plan_goal' | 'tangent_capture' | 'sprint_deferred' | 'agent_suggested' | 'developer_added';
      depends_on_decisions?: string[];
      source_thread_id?:     string;
      target_sprint_id?:     string;
    } | null;
    if (!body || typeof body.description !== 'string' || body.description.trim().length === 0) {
      return NextResponse.json({ error: 'invalid_body', detail: 'expected { description: string }' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('dev_goal_backlog')
      .insert({
        project_id:           projectId,
        description:          body.description.trim(),
        source:               body.source ?? 'developer_added',
        depends_on_decisions: body.depends_on_decisions ?? [],
        source_thread_id:     body.source_thread_id ?? 'developer_ui',
        source_turn_number:   0,
        target_sprint_id:     body.target_sprint_id ?? null,
        resolved:             false,
        surfaced:             true,
        acknowledged:         false,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ entry: data });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
