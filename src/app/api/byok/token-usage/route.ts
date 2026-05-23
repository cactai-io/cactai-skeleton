// src/app/api/byok/token-usage/route.ts
//
// v1.3.5 Build 3 — End-user BYOK token-usage proxy. Forwards to the
// platform's /v1/shell/byok/token-usage with the deployed app's
// server-side API key and the end user's identity from the session.
//
// End-user-controlled limits/alerts (R6) read from this same surface in
// v2 (display only here).

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { endpoints }   from '@/lib/endpoints';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!endpoints.cactaiApiKey) {
      return NextResponse.json({ buckets: [] });
    }
    const res = await fetch(
      `${endpoints.cactaiBase}/v1/shell/byok/token-usage?end_user_id=${encodeURIComponent(session.id)}`,
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
