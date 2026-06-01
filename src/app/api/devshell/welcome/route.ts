// src/app/api/devshell/welcome/route.ts
//
// Server-side proxy that fetches the DevShell welcome content from the
// Cactai platform. Welcome content is authored on the platform
// (cactai-platform/apps/api/src/devshell/purpose-capture/index.ts) so
// updates propagate to every customer app on the next platform deploy
// without requiring a customer-app rebuild or vendor sync.
//
// The platform endpoint also decides whether to show the welcome —
// returns should_show=false once the developer has submitted their
// purpose statement (build_phase advances past 'purpose_capture').
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireDevRole();

    const apiKey    = endpoints.cactaiApiKey;
    const baseUrl   = endpoints.cactaiBase;
    const projectId = endpoints.projectId;
    if (!apiKey || !projectId) {
      return NextResponse.json({ should_show: false });
    }

    const url = new URL(req.url);
    const personalityName = url.searchParams.get('personality_name') ?? 'Ember';

    const res = await fetch(
      `${baseUrl}/v1/projects/${projectId}/devshell/welcome?personality_name=${encodeURIComponent(personalityName)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) return NextResponse.json({ should_show: false });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ should_show: false });
  }
}
