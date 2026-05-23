// src/app/api/workflow/backlog/[id]/resolve/route.ts
// Marks a backlog entry as resolved in the developer's own Supabase.
// Called when the developer dismisses or acts on a backlog entry in Plan
// view. Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function POST(
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
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ resolved: true });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
