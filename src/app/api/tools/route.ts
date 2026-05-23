// src/app/api/tools/route.ts
// Server-side proxy that fetches the available tool catalogue from the
// Cactai platform API. CACTAI_API_KEY is server-only and must never be
// exposed to the browser, so the DevShell BuildPanel (Installed tab,
// merged from the v1.0 CapabilitiesPanel + MarketplacePanel) calls this
// route instead of calling the platform directly.
//
// Protected: dev/collaborator only.

import { endpoints } from '@/lib/endpoints';
import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

export async function GET() {
  try {
    await requireDevRole();

    const apiKey  = endpoints.cactaiApiKey;
    const baseUrl = endpoints.cactaiBase;

    if (!apiKey) return NextResponse.json({ tools: [] });

    const res = await fetch(`${baseUrl}/v1/tools`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return NextResponse.json({ tools: [] });

    const data = await res.json() as {
      tools?: Array<{ id: string; name: string; domain: string; description: string }>;
    };
    return NextResponse.json({ tools: data.tools ?? [] });
  } catch {
    return NextResponse.json({ tools: [] });
  }
}
