// src/app/api/settings/appshell-auth/route.ts
// Read and update the AppShell OAuth credentials (Google + Apple sign-in
// for end users of this app). Proxies to the platform's
// /v1/projects/:id/appshell-oauth endpoint with the project's CACTAI_API_KEY.
//
// Returns secrets as masked tails; PUT accepts new secrets or omits them
// to retain the previously-stored value.
//
// Protected: dev only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';

async function callPlatform(method: 'GET' | 'PUT', body?: unknown): Promise<Response> {
  const url = `${endpoints.cactaiBase}/v1/projects/${endpoints.projectId}/appshell-oauth`;
  return fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${endpoints.cactaiApiKey}`,
      'Content-Type':  'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function GET() {
  try {
    await requireDevRole();
    const res = await callPlatform('GET');
    const payload = await res.json().catch(() => ({}));
    return NextResponse.json(payload, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireDevRole();
    const body = await req.json().catch(() => ({}));
    const res = await callPlatform('PUT', body);
    const payload = await res.json().catch(() => ({}));
    return NextResponse.json(payload, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
