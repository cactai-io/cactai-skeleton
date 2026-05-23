// src/app/api/operate/token-usage/route.ts
//
// v1.3.5 Build 3 — Operate-panel token-usage proxy. Forwards to the
// platform's /v1/operate/token-usage endpoint with the deployed app's
// server-side API key. Display only — limits/alerts are v2.
//
// Access: super_admin lens only. End-user-controlled BYOK alerts/limits
// (R6) belong on the end-user surface, not here.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth }   from '@/lib/auth';
import { endpoints }     from '@/lib/endpoints';

function isSuperAdmin(activeLens: string | null): boolean {
  return activeLens === 'super_admin';
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!isSuperAdmin(session.active_lens)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (!endpoints.cactaiApiKey) {
      return NextResponse.json({ buckets: [] });
    }
    const url = new URL(req.url);
    const includeByok = url.searchParams.get('include_byok') === '1';
    const res = await fetch(
      `${endpoints.cactaiBase}/v1/operate/token-usage${includeByok ? '?include_byok=1' : ''}`,
      {
        headers: { Authorization: `Bearer ${endpoints.cactaiApiKey}` },
        cache:   'no-store',
      },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}
