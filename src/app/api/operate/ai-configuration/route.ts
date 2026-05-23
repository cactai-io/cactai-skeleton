// src/app/api/operate/ai-configuration/route.ts
// Read and write the developer's reasoning-model selection. Stored at
// project_state.decisions.reasoning_model_v1.
//
// The platform's OrchestrationEngine reads this at session-open time and
// stashes it on session.working_memory.shell_meta.reasoning_model so the
// engine can skip its Sonnet classifier when the developer has explicitly
// chosen. See gas-engine-reasoning-tool-tier-implementation.md.
//
// Access: super_admin lens only. AI cost / quality affects every user in
// the app — admin-and-below shouldn't be able to switch the tier.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  loadReasoningModel,
  saveReasoningModel,
  type ReasoningModelChoice,
} from '@/lib/projectDecisions.server';

function isSuperAdmin(activeLens: string | null): boolean {
  return activeLens === 'super_admin';
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (!isSuperAdmin(session.active_lens)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const choice = await loadReasoningModel();
    return NextResponse.json({ reasoning_model: choice });
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
    const body = (await req.json().catch(() => ({}))) as { reasoning_model?: unknown };
    const raw = body.reasoning_model;
    // null clears the manual pick and re-enables the engine's classifier.
    if (raw !== null && raw !== 'sonnet' && raw !== 'opus') {
      return NextResponse.json({ error: 'invalid_value', detail: 'reasoning_model must be "sonnet", "opus", or null' }, { status: 400 });
    }
    await saveReasoningModel(raw as ReasoningModelChoice | null);
    return NextResponse.json({ ok: true, reasoning_model: raw });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}
