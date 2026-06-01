// src/app/api/workflow/notes/route.ts
// Plan view notes: free-form per-project markdown + per-decision note
// threads. Stored under project_state.decisions._notes so no schema
// migration is needed. Two shapes inside:
//   _notes.project           = string (markdown)
//   _notes.decisions[key]    = Array<{ at: string; content: string }>
//
// GET returns the full notes blob. POST accepts either a full
// { project } string update or a { decision_key, content } append.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

interface NotesShape {
  project?:  string;
  decisions?: Record<string, Array<{ at: string; content: string }>>;
}

async function loadNotes(): Promise<NotesShape> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('project_state')
    .select('decisions')
    .eq('project_id', endpoints.projectId)
    .maybeSingle();
  const decisions = (data?.decisions ?? {}) as Record<string, unknown>;
  const notes = (decisions['_notes'] ?? {}) as NotesShape;
  return notes;
}

async function saveNotes(notes: NotesShape): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { data: state } = await supabase
    .from('project_state')
    .select('decisions')
    .eq('project_id', endpoints.projectId)
    .maybeSingle();
  const decisions = (state?.decisions ?? {}) as Record<string, unknown>;
  const next = { ...decisions, _notes: notes };
  await supabase
    .from('project_state')
    .upsert({ project_id: endpoints.projectId, decisions: next });
}

export async function GET() {
  try {
    await requireDevRole();
    const notes = await loadNotes();
    return NextResponse.json({
      project:   notes.project ?? '',
      decisions: notes.decisions ?? {},
    });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireDevRole();
    const body = await req.json() as {
      project?:       string;
      decision_key?:  string;
      content?:       string;
    };

    const notes = await loadNotes();
    if (typeof body.project === 'string') {
      notes.project = body.project;
    }
    if (body.decision_key && typeof body.content === 'string' && body.content.length > 0) {
      const thread = notes.decisions?.[body.decision_key] ?? [];
      notes.decisions = {
        ...(notes.decisions ?? {}),
        [body.decision_key]: [...thread, { at: new Date().toISOString(), content: body.content }],
      };
    }
    await saveNotes(notes);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
