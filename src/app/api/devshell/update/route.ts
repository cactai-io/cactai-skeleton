// src/app/api/devshell/update/route.ts
//
// Triggers a platform update PR against this app's repo. The actual work
// (read platform-managed content, diff customer tree, open PR) happens
// entirely on the platform side using the developer's stored GitHub PAT.
// This route is a thin proxy that forwards the developer's approval.
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await requireDevRole();

    const apiKey    = endpoints.cactaiApiKey;
    const baseUrl   = endpoints.cactaiBase;
    const projectId = endpoints.projectId;
    if (!apiKey || !projectId) {
      return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
    }

    let body: { changelog?: string } = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    const res = await fetch(`${baseUrl}/v1/projects/${projectId}/devshell/update`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'apply_failed', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
