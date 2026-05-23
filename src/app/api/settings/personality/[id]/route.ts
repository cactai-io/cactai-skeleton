// src/app/api/settings/personality/[id]/route.ts
// v1.2 Thread 07 — editor surface for a single dev-authored personality.
//
// GET    — return the full editable record
// PATCH  — apply partial edits to the record
//
// Built-in personalities (sam, milo, ember) are not exposed here. The
// picker presents them as selectable but the editor refuses to load them
// and the UI treats them as read-only.
//
// Protected: dev only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import {
  loadDevAuthoredPersonalities,
  saveDevAuthoredPersonality,
} from '@/lib/projectDecisions.server';
import type {
  DevAuthoredPersonalityRecord,
  DevAuthoredPersonalityEditPatch,
  ProductPersonality,
} from '@cactai-io/types';

interface Params { params: Promise<{ id: string }> }

const BUILT_IN_IDS = new Set(['sam', 'milo', 'ember']);

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireDevRole();
    const { id } = await params;

    if (BUILT_IN_IDS.has(id)) {
      return NextResponse.json({ error: 'built_in_not_editable', id }, { status: 403 });
    }

    const records = await loadDevAuthoredPersonalities();
    const rec     = records[id];
    if (!rec) return NextResponse.json({ error: 'not_found', id }, { status: 404 });

    return NextResponse.json(rec);
  } catch (err) {
    return NextResponse.json(
      { error: 'personality_load_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }
    const { id } = await params;

    if (BUILT_IN_IDS.has(id)) {
      return NextResponse.json(
        { error: 'built_in_not_editable', id, hint: 'create_new_personality_based_on_this' },
        { status: 403 },
      );
    }

    const patch = (await req.json()) as DevAuthoredPersonalityEditPatch;
    const records = await loadDevAuthoredPersonalities();
    const existing = records[id];
    if (!existing) return NextResponse.json({ error: 'not_found', id }, { status: 404 });

    const next: DevAuthoredPersonalityRecord = {
      ...existing,
      display_name: patch.display_name ?? existing.display_name,
      description:  patch.description  ?? existing.description,
      sample_line:  patch.sample_line  ?? existing.sample_line,
      definition:   mergeDefinition(existing.definition, patch.definition),
      updated_at:   new Date().toISOString(),
    };

    await saveDevAuthoredPersonality(next);
    return NextResponse.json(next);
  } catch (err) {
    return NextResponse.json(
      { error: 'personality_update_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// Shallow-merge the ProductPersonality definition. Each nested object
// (identity, behavioral, constraints) is overlaid field-by-field; arrays
// are replaced wholesale since per-element edits go through the editor's
// re-submit of the full array.
function mergeDefinition(
  base:  ProductPersonality,
  patch: Partial<ProductPersonality> | undefined,
): ProductPersonality {
  if (!patch) return base;
  return {
    identity:    { ...base.identity,    ...(patch.identity    ?? {}) },
    behavioral:  { ...base.behavioral,  ...(patch.behavioral  ?? {}) },
    constraints: { ...base.constraints, ...(patch.constraints ?? {}) },
  };
}
