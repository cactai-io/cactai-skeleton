// src/app/api/workflow/backlog/[id]/route.ts
// Per-entry backlog routes.
//   PATCH  { description?, depends_on_decisions?, target_sprint_id?,
//            acknowledged? } → partial update; only the supplied fields
//           change.
//   DELETE → hard delete (vs the resolve route which keeps the row with
//            resolved=true for audit).
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
      description?:          string;
      depends_on_decisions?: string[];
      target_sprint_id?:     string | null;
      acknowledged?:         boolean;
    } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.description === 'string' && body.description.trim().length > 0) {
      patch.description = body.description.trim();
    }
    if (Array.isArray(body.depends_on_decisions)) {
      patch.depends_on_decisions = body.depends_on_decisions;
    }
    if (body.target_sprint_id === null || typeof body.target_sprint_id === 'string') {
      patch.target_sprint_id = body.target_sprint_id;
    }
    if (typeof body.acknowledged === 'boolean') {
      patch.acknowledged = body.acknowledged;
      if (body.acknowledged) {
        patch.acknowledged_at = new Date().toISOString();
      }
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('dev_goal_backlog')
      .update(patch)
      .eq('id', id)
      .eq('project_id', projectId)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ entry: data });
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
    const { error } = await supabase
      .from('dev_goal_backlog')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);
    if (error) {
      return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
