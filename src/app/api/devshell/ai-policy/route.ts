// src/app/api/devshell/ai-policy/route.ts
//
// Thin proxy for the App Configuration → AI tab (keys policy + budgets).
// GET reads the app's global policy + per-provider overrides; PUT updates
// the global default and/or one provider's override. The platform side does
// the customer-DB work with the developer's stored service-role credentials.
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

async function forward(method: 'GET' | 'PUT', body?: unknown) {
  await requireDevRole();
  const apiKey    = endpoints.cactaiApiKey;
  const baseUrl   = endpoints.cactaiBase;
  const projectId = endpoints.projectId;
  if (!apiKey || !projectId) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  const res = await fetch(`${baseUrl}/v1/projects/${projectId}/devshell/ai-policy`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: method === 'PUT' ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET() {
  try {
    return await forward('GET');
  } catch (err) {
    return NextResponse.json({ error: 'ai_policy_read_failed', detail: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let body: unknown = {};
    try { body = await req.json(); } catch { /* empty */ }
    return await forward('PUT', body);
  } catch (err) {
    return NextResponse.json({ error: 'ai_policy_write_failed', detail: (err as Error).message }, { status: 500 });
  }
}
