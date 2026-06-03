// src/app/api/devshell/assets/[id]/route.ts
//
// Library uploads proxy — delete one asset by id. Protected: dev/collaborator.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDevRole();
    const { id } = await params;
    const apiKey    = endpoints.cactaiApiKey;
    const baseUrl   = endpoints.cactaiBase;
    const projectId = endpoints.projectId;
    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    const res = await fetch(`${baseUrl}/v1/projects/${projectId}/devshell/assets/${encodeURIComponent(id)}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'assets_delete_failed', detail: (err as Error).message }, { status: 500 });
  }
}
