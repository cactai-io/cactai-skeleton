// src/app/api/devshell/assets/[id]/download/route.ts
//
// Library uploads proxy — download one asset's bytes. Streams the binary
// response (with content-type + content-disposition) straight from the
// platform so a plain <a href> triggers a file download.
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDevRole();
    const { id } = await params;
    const apiKey    = endpoints.cactaiApiKey;
    const baseUrl   = endpoints.cactaiBase;
    const projectId = endpoints.projectId;
    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    const res = await fetch(`${baseUrl}/v1/projects/${projectId}/devshell/assets/${encodeURIComponent(id)}/download`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }
    // Forward the binary body + relevant headers.
    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        'Content-Type':        res.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'assets_download_failed', detail: (err as Error).message }, { status: 500 });
  }
}
