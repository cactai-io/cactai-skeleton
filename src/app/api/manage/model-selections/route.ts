// src/app/api/manage/model-selections/route.ts
// Read and write the per-task-type Agent SDK model selections. Stored
// at project_state.decisions.model_selections_v1. Phase 14, Gap 81.
//
// The platform's orchestrator launch*Dispatch functions read this at
// dispatch time and pass it as hooks.modelSelections to the
// AgentDispatcher. Per agent-sdk-model-selection-protocol.md, the
// settings panel writes here on save; the spec's optional GitHub
// commit to config/agent-sdk/model-selections.ts in the developer's
// repo is a future "Apply to deployed app" path.
//
// Access: super_admin lens only. Model selections affect cost + quality
// of every dispatch — admin-and-below shouldn't be able to change them.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  loadModelSelections,
  saveModelSelections,
  type ModelSelectionsDecision,
} from '@/lib/projectDecisions.server';

function isSuperAdmin(activeLens: string | null): boolean {
  return activeLens === 'super_admin';
}

const TASK_TYPES = new Set([
  'file_reading',
  'discrete_file_change',
  'component_page_generation',
  'api_route_handler_generation',
  'database_schema',
  'tool_skill_authoring',
  'ui_design_styling',
  'code_review',
  'refactoring',
  'legal_content_generation',
  'complex_multi_file_feature',
]);

const TIERS = new Set(['haiku', 'sonnet', 'opus']);

export async function GET() {
  try {
    const session = await requireAuth();
    if (!isSuperAdmin(session.active_lens)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const selections = await loadModelSelections();
    return NextResponse.json({ selections });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!isSuperAdmin(session.active_lens)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as { selections?: unknown };
    if (!body.selections || typeof body.selections !== 'object') {
      return NextResponse.json({ error: 'invalid_body', detail: '`selections` object required' }, { status: 400 });
    }
    // Validate shape: every key must be a known task type, every value
    // must be a known tier. Reject on first invalid entry so callers
    // notice schema drift early.
    const incoming = body.selections as Record<string, unknown>;
    for (const [k, v] of Object.entries(incoming)) {
      if (!TASK_TYPES.has(k)) {
        return NextResponse.json({ error: 'invalid_task_type', detail: k }, { status: 400 });
      }
      if (typeof v !== 'string' || !TIERS.has(v)) {
        return NextResponse.json({ error: 'invalid_tier', detail: `${k}=${String(v)}` }, { status: 400 });
      }
    }
    await saveModelSelections(incoming as unknown as ModelSelectionsDecision);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}
