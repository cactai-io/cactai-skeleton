// src/app/api/byok/user-model-selections/route.ts
//
// v1.4 — End-user provider+model picks. Stored on the customer DB at
// project_state.decisions.model_selections_v1.user[<user_id>] so the
// resolveTurnPick algorithm can read the user's chat / gen overrides
// without joining a dedicated table. The shape mirrors the dev/app
// slices: { routing: {capability → provider_id}, providers: {provider_id → {selection}} }.
//
// Auth: any signed-in user; the user_id sub-key isolates each user.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase.server';
import { endpoints } from '@/lib/endpoints';

interface UserSlice {
  routing?:   Record<string, string>;
  providers?: Record<string, { selection?: string }>;
}
type UserSliceMap = Record<string, UserSlice>;

async function requireUserId(): Promise<string | null> {
  const sb = await createServerSupabaseClient();
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

async function loadDecisions(): Promise<Record<string, unknown>> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('project_state')
    .select('decisions')
    .eq('project_id', endpoints.projectId)
    .maybeSingle();
  return (data?.decisions ?? {}) as Record<string, unknown>;
}

async function saveDecisions(decisions: Record<string, unknown>): Promise<void> {
  const supabase = createServiceSupabaseClient();
  await supabase
    .from('project_state')
    .upsert({ project_id: endpoints.projectId, decisions }, { onConflict: 'project_id' });
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const decisions = await loadDecisions();
  const blob      = (decisions['model_selections_v1'] ?? {}) as Record<string, unknown>;
  const userMap   = (blob.user ?? {}) as UserSliceMap;
  const slice     = userMap[userId] ?? {};
  return NextResponse.json({ slice });
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { slice?: UserSlice };
  if (!body.slice || typeof body.slice !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const decisions = await loadDecisions();
  const blob      = (decisions['model_selections_v1'] ?? {}) as Record<string, unknown>;
  const userMap   = (blob.user ?? {}) as UserSliceMap;
  userMap[userId] = body.slice;
  blob.user       = userMap;
  decisions['model_selections_v1'] = blob;
  await saveDecisions(decisions);

  return NextResponse.json({ ok: true });
}
