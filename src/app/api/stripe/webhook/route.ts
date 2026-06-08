// src/app/api/stripe/webhook/route.ts
// Stripe module — receive subscription lifecycle webhooks and sync the local
// mirror. Part of the 'stripe' registry entry; deleted on Remove.
//
// NOT flag-gated: Stripe calls this unauthenticated, so it can't read the
// authenticated feature-flag store — and it doesn't need to. The Stripe
// signature IS the gate (only Stripe can produce a valid signature). Reads the
// RAW body (required for signature verification) via req.text().

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, syncSubscriptionEvent } from '@/lib/stripe.server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing stripe-signature' }, { status: 400 });
  }

  let event;
  try {
    const raw = await req.text();
    event = constructWebhookEvent(raw, signature);
  } catch (err) {
    return NextResponse.json({ error: `invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    await syncSubscriptionEvent(event);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? 'sync_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
