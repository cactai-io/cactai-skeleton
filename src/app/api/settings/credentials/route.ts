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
