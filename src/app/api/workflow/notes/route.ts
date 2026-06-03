// src/app/api/workflow/notes/route.ts
// Plan-view notes — a collection of independent, named notes with full CRUD.
// Stored under project_state.decisions._notes.items so no schema migration is
// needed:
//   _notes.items = Array<{ id, title, body, created_at, updated_at }>
//
// Back-compat: a legacy single-markdown note (_notes.project) is migrated into
// one item on first read so existing content isn't lost. Legacy per-decision
// threads (_notes.decisions) are left untouched.
//
//   GET                     → { items }
//   POST   { title, body }  → { item }          (create)
//   PATCH  { id, title?, body? } → { item }      (edit)
//   DELETE ?id=…            → { ok: true }       (delete)

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export const runtime = 'nodejs';

interface NoteItem {
  id:         string;
  title:      string;
  body:       string;
  created_at: string;
  updated_at: string;
}
interface NotesShape {
  items?:     NoteItem[];
  // Legacy shapes, preserved for back-compat / migration.
  project?:   string;
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
  return (decisions['_notes'] ?? {}) as NotesShape;
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

// One-time migration: fold a legacy single-markdown note into the items list.
function migrate(notes: NotesShape): NotesShape {
  if ((!notes.items || notes.items.length === 0) && notes.project && notes.project.trim()) {
    const now = new Date().toISOString();
    return {
      ...notes,
      project: '',
      items: [{ id: randomUUID(), title: 'Notes', body: notes.project, created_at: now, updated_at: now }],
    };
  }
  return { ...notes, items: notes.items ?? [] };
}

export async function GET() {
  try {
    await requireDevRole();
    const notes = migrate(await loadNotes());
    return NextResponse.json({ items: notes.items ?? [] });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireDevRole();
    const body  = await req.json().catch(() => ({})) as { title?: string; body?: string };
    const notes = migrate(await loadNotes());
    const now   = new Date().toISOString();
    const item: NoteItem = {
      id:         randomUUID(),
      title:      (body.title ?? '').trim() || 'Untitled note',
      body:       body.body ?? '',
      created_at: now,
      updated_at: now,
    };
    notes.items = [...(notes.items ?? []), item];
    await saveNotes(notes);
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireDevRole();
    const body = await req.json().catch(() => ({})) as { id?: string; title?: string; body?: string };
    if (!body.id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
    const notes = migrate(await loadNotes());
    const items = notes.items ?? [];
    const idx   = items.findIndex(n => n.id === body.id);
    if (idx < 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const updated: NoteItem = {
      ...items[idx]!,
      title:      body.title !== undefined ? (body.title.trim() || 'Untitled note') : items[idx]!.title,
      body:       body.body  !== undefined ? body.body : items[idx]!.body,
      updated_at: new Date().toISOString(),
    };
    items[idx]  = updated;
    notes.items = items;
    await saveNotes(notes);
    return NextResponse.json({ item: updated });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireDevRole();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
    const notes = migrate(await loadNotes());
    notes.items = (notes.items ?? []).filter(n => n.id !== id);
    await saveNotes(notes);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
