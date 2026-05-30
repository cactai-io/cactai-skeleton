// src/app/api/settings/credentials/route.ts
// Stores per-app credential metadata (OAuth client IDs, redirect URIs,
// feature toggles) in the developer's own Supabase. Sensitive values like
// client *secrets* are intended to be written into Vercel project env vars
// directly via the Vercel API — not stored in the database. This route only
// records non-secret display fields (e.g. enabled providers list).
//
// Protected: dev only.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

// GET returns the per-app credential metadata previously written via
// POST. Keys live in project_state.decisions under the `credential.*`
// namespace. The panel only needs to know whether each canonical
// CredentialsRecord field is set — it renders masked dots on presence
// and "Not set" on absence — so this route just projects the stored
// keys back into a flat record.
//
// Pre-fix: this route only defined POST, so the DevShell settings
// panel's per-source fetch got 405 on every load and the Credentials
// section never populated. Added GET to match the other per-source
// settings routes (byok / personality / workflow / capabilities).
export async function GET() {
  try {
    await requireDevRole();
    const supabase = createServiceSupabaseClient();
    const projectId = endpoints.projectId;

    const { data, error } = await supabase
      .from('project_state')
      .select('decisions')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        error:  'credentials_load_failed',
        detail: error.message,
      }, { status: 502 });
    }

    const decisions = (data?.decisions ?? {}) as Record<string, unknown>;
    const credentials: Record<string, string> = {};
    for (const [k, v] of Object.entries(decisions)) {
      if (!k.startsWith('credential.')) continue;
      const name  = k.slice('credential.'.length);
      const value = (v && typeof v === 'object' && 'value' in (v as Record<string, unknown>))
        ? String((v as { value: unknown }).value ?? '')
        : '';
      if (value) credentials[name] = value;
    }

    return NextResponse.json({ credentials });
  } catch (err) {
    return NextResponse.json({
      error:  'credentials_internal',
      detail: err instanceof Error ? err.message : 'unknown',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }

    const { key, value } = await req.json() as { key: string; value: string };

    // Disallow writing values that look like secrets through this route — the
    // dev shell has a separate flow for piping secrets to Vercel envs.
    if (/secret|service[_-]?key|private[_-]?key/i.test(key)) {
      return NextResponse.json({ error: 'use_vercel_env_for_secrets' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const projectId = endpoints.projectId;

    const { error } = await supabase
      .from('project_state')
      .update({
        decisions: { [`credential.${key}`]: { value, set_at: new Date().toISOString() } },
      })
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ updated: key });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
