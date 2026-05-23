// src/app/api/settings/signup-policy/route.ts
// Read and update the app's signup mode. Stored in project_state.decisions
// under the key signup_mode_v1 (see @/lib/signup-mode for the SignupMode
// enum and supporting helpers).
//
// v1.2.4 hard cutover: the v1.2.3 keys (signup_policy + signup_default_role)
// are no longer read or written. New deploys never wrote them; locked
// decision is no migration code.
//
// Server-side validation is strict (locked Decision 3 of Fix 3): the PUT
// route accepts ONLY the four canonical mode strings. Unknown bodies are
// rejected outright rather than partially-applied.
//
// Protected: dev only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';
import { createServiceSupabaseClient } from '@/lib/supabase.server';
import {
  DEFAULT_SIGNUP_MODE,
  isSignupMode,
  SIGNUP_MODE_KEY,
  type SignupMode,
} from '@/lib/signup-mode';

interface StoredDecisions {
  [SIGNUP_MODE_KEY]?: SignupMode;
}

export async function GET() {
  try {
    await requireDevRole();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('project_state')
      .select('decisions')
      .eq('project_id', endpoints.projectId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'load_failed', detail: error.message }, { status: 502 });
    }
    const decisions = (data?.decisions ?? {}) as StoredDecisions;
    const stored    = decisions[SIGNUP_MODE_KEY];
    return NextResponse.json({
      signup_mode: isSignupMode(stored) ? stored : DEFAULT_SIGNUP_MODE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireDevRole();
    const body = await req.json().catch(() => ({})) as { signup_mode?: unknown };

    // Strict validation: signup_mode is required, must be one of the four
    // canonical strings, no partial updates supported on this route.
    if (body.signup_mode === undefined) {
      return NextResponse.json({ error: 'missing_signup_mode' }, { status: 400 });
    }
    if (!isSignupMode(body.signup_mode)) {
      return NextResponse.json({ error: 'invalid_signup_mode' }, { status: 400 });
    }
    const signupMode: SignupMode = body.signup_mode;

    const supabase = createServiceSupabaseClient();

    // Read-modify-write to preserve other decision keys.
    const { data: existing } = await supabase
      .from('project_state')
      .select('decisions')
      .eq('project_id', endpoints.projectId)
      .maybeSingle();

    const existingDecisions = (existing?.decisions ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      ...existingDecisions,
      [SIGNUP_MODE_KEY]: signupMode,
    };

    const { error } = await supabase
      .from('project_state')
      .upsert({
        project_id: endpoints.projectId,
        decisions:  merged,
      }, { onConflict: 'project_id' });

    if (error) {
      return NextResponse.json({ error: 'save_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ signup_mode: signupMode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
