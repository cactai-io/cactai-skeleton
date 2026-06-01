// src/app/api/devshell/update/check/route.ts
//
// Lightweight version comparison. The DevShell hits this on mount and
// periodically to detect platform-side updates. Returns the version
// delta but does not perform any write. Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

export async function GET() {
  try {
    await requireDevRole();

    const apiKey    = endpoints.cactaiApiKey;
    const baseUrl   = endpoints.cactaiBase;
    const projectId = endpoints.projectId;
    if (!apiKey || !projectId) {
      return NextResponse.json({ has_update: false, error: 'not_configured' });
    }

    const res = await fetch(`${baseUrl}/v1/projects/${projectId}/devshell/update/check`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return NextResponse.json({ has_update: false, error: `upstream_${res.status}` });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ has_update: false, error: 'check_failed' });
  }
}
