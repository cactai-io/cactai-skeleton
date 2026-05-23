// src/app/api/settings/personality/route.ts
// v1.2 Thread 07 — personality picker + dev-authored personality editor.
//
// Reads:  active personality id, built-in personalities (proxied from
//         platform), dev-authored personalities (stored locally on the
//         developer's Supabase under project_state.decisions).
// Writes: active personality id; dev-authored personality fields.
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import {
  loadActivePersonalityId,
  saveActivePersonalityId,
  loadDevAuthoredPersonalities,
} from '@/lib/projectDecisions.server';
import type {
  ProductPersonality,
  ProjectPersonalityAssignment,
  ProjectPersonalityResponse,
  ProjectPersonalityPatch,
} from '@cactai-io/types';

// GET — return the picker's data: active id + all available personalities.
export async function GET() {
  try {
    await requireDevRole();

    const [builtIns, devAuthored, activeIdRaw] = await Promise.all([
      fetchPlatformPersonalities(),
      loadDevAuthoredPersonalities(),
      loadActivePersonalityId(),
    ]);

    const devAuthoredList: ProjectPersonalityAssignment[] = Object.values(devAuthored).map((rec) => ({
      id:           rec.id,
      display_name: rec.display_name,
      description:  rec.description,
      sample_line:  rec.sample_line,
      source:       'developer_authored',
    }));

    const available: ProjectPersonalityAssignment[] = [
      ...builtIns,
      ...devAuthoredList,
    ];

    // Default active = sam if nothing's been chosen yet (matches the
    // wizard's default at the personality step).
    const active_id = activeIdRaw ?? 'sam';

    const body: ProjectPersonalityResponse = { active_id, available };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'personality_load_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// PATCH — swap the active personality. The next agent turn picks it up.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }

    const patch = (await req.json()) as ProjectPersonalityPatch;
    if (!patch?.active_id || typeof patch.active_id !== 'string') {
      return NextResponse.json({ error: 'invalid_active_id' }, { status: 400 });
    }

    // Validate against the picker's available set. Refusing unknown ids
    // here keeps the agent runtime from booting into a "personality not
    // found" state on the next turn.
    const [builtIns, devAuthored] = await Promise.all([
      fetchPlatformPersonalities(),
      loadDevAuthoredPersonalities(),
    ]);
    const known = new Set<string>([
      ...builtIns.map((b) => b.id),
      ...Object.keys(devAuthored),
    ]);
    if (!known.has(patch.active_id)) {
      return NextResponse.json({ error: 'unknown_personality', id: patch.active_id }, { status: 404 });
    }

    await saveActivePersonalityId(patch.active_id);
    return NextResponse.json({ ok: true, active_id: patch.active_id });
  } catch (err) {
    return NextResponse.json(
      { error: 'personality_update_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// Fetch the platform's built-in personalities as picker assignments.
async function fetchPlatformPersonalities(): Promise<ProjectPersonalityAssignment[]> {
  const apiKey  = endpoints.cactaiApiKey;
  const baseUrl = endpoints.cactaiBase;
  if (!apiKey) return [];

  const res = await fetch(`${baseUrl}/v1/catalogue`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next:    { revalidate: 30 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    personalities?: Array<{
      id:           string;
      name:         string;
      description:  string;
      sample_line:  string;
      source:       'built_in';
    }>;
  };

  return (data.personalities ?? []).map((p) => ({
    id:           p.id,
    display_name: p.name,
    description:  p.description,
    sample_line:  p.sample_line,
    source:       'built_in',
  }));
}

// Re-export for the editor route's type guard.
export type { ProductPersonality };
