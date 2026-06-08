// src/app/api/sharing/route.ts
// Sharing module — create + list share links (authed owner).
// Gated by the 'sharing' feature flag; a disabled app 404s this surface.
// Part of the 'sharing' registry entry; deleted on Remove.

import { NextRequest, NextResponse } from 'next/server';
import { featureEnabled } from '@/lib/features';
import { createShareLink, listShareLinks } from '@/lib/sharing.server';

export async function GET(): Promise<NextResponse> {
  if (!(await featureEnabled('sharing'))) {
    return NextResponse.json({ error: 'sharing_disabled' }, { status: 404 });
  }
  try {
    const links = await listShareLinks();
    return NextResponse.json({ links });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? 'list_failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await featureEnabled('sharing'))) {
    return NextResponse.json({ error: 'sharing_disabled' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => null);
    if (!body?.resource_type || !body?.resource_id) {
      return NextResponse.json(
        { error: 'resource_type and resource_id are required' },
        { status: 400 },
      );
    }
    const link = await createShareLink({
      resource_type: String(body.resource_type),
      resource_id:   String(body.resource_id),
      mode:          body.mode,
      expires_at:    body.expires_at ?? null,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? 'create_failed' }, { status: 500 });
  }
}
