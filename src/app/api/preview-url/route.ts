// src/app/api/preview-url/route.ts
// Server-side proxy for fetching the Vercel preview URL from the Cactai
// platform API. The CACTAI_API_KEY is a server-only env var — it must never
// be exposed to the browser. All client components call this route instead
// of calling the platform API directly.
//
// Protected: dev/collaborator only.

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
      return NextResponse.json({ preview_url: null });
    }

    const res = await fetch(`${baseUrl}/v1/projects/${projectId}/preview-url`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return NextResponse.json({ preview_url: null });

    const data = await res.json() as { preview_url?: string | null };
    return NextResponse.json({ preview_url: data.preview_url ?? null });
  } catch {
    return NextResponse.json({ preview_url: null });
  }
}
