// src/app/api/settings/app-config/route.ts
// v1.4 — persistence for the App Configuration "ADD" tabs (Sharing,
// Collaboration, AI Actions, Custom tabs) + the wizard-driven tab visibility.
// These store as decisions.* keys (no migration); visibility derives from the
// build manifest's pruning flags.
//
//   GET — returns { sharing, collaboration, ai_actions, custom_tabs, visibility }
//   PUT — { key, value } updates one decisions key (whitelisted server-side)
//
// Protected: dev/collaborator role (same as the other settings routes).

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { loadAppConfigExtras, saveAppConfigExtra } from '@/lib/projectDecisions.server';

export async function GET() {
  try {
    await requireDevRole();
    return NextResponse.json(await loadAppConfigExtras());
  } catch (err) {
    return NextResponse.json(
      { error: 'app_config_failed', detail: (err as Error).message }, { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireDevRole();
    const body = await req.json().catch(() => ({})) as { key?: string; value?: unknown };
    if (!body.key) {
      return NextResponse.json({ error: 'key_required' }, { status: 400 });
    }
    await saveAppConfigExtra(body.key, body.value);
    return NextResponse.json(await loadAppConfigExtras());
  } catch (err) {
    return NextResponse.json(
      { error: 'app_config_save_failed', detail: (err as Error).message }, { status: 500 },
    );
  }
}
