// src/app/api/stripe/portal/route.ts
// Stripe module — open the self-service billing portal (authed). Flag-gated.
// Part of the 'stripe' registry entry; deleted on Remove.

import { NextRequest, NextResponse } from 'next/server';
import { featureEnabled } from '@/lib/features';
import { requireAuth } from '@/lib/auth';
import { createPortalSession } from '@/lib/stripe.server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await featureEnabled('stripe'))) {
    return NextResponse.json({ error: 'billing_disabled' }, { status: 404 });
  }
  try {
    const session = await requireAuth();
    const url     = await createPortalSession(session.id, `${req.nextUrl.origin}/app`);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? 'portal_failed' }, { status: 500 });
  }
}
