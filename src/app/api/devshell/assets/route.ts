// src/app/api/devshell/assets/route.ts
//
// Library uploads proxy. GET lists the app's uploaded asset metadata; POST
// uploads one asset ({ filename, content_type, data_base64 }). The platform
// side stores the bytes in the customer DB with the developer's service-role
// credentials.
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

async function forward(method: 'GET' | 'POST', body?: unknown) {
  await requireDevRole();
  const apiKey    = endpoints.cactaiApiKey;
  const baseUrl   = endpoints.cactaiBase;
  const projectId = endpoints.projectId;
  if (!apiKey || !projectId) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  const res = await fetch(`${baseUrl}/v1/projects/${projectId}/devshell/assets`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET() {
  try {
    return await forward('GET');
  } catch (err) {
    return NextResponse.json({ error: 'assets_read_failed', detail: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown = {};
    try { body = await req.json(); } catch { /* empty */ }
    return await forward('POST', body);
  } catch (err) {
    return NextResponse.json({ error: 'assets_write_failed', detail: (err as Error).message }, { status: 500 });
  }
}
