// src/app/api/stripe/checkout/route.ts
// Stripe module — start a subscription Checkout (authed). Flag-gated ('stripe').
// Part of the 'stripe' registry entry; deleted on Remove.

import { NextRequest, NextResponse } from 'next/server';
import { featureEnabled } from '@/lib/features';
import { requireAuth } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe.server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await featureEnabled('stripe'))) {
    return NextResponse.json({ error: 'billing_disabled' }, { status: 404 });
  }
  try {
    const session = await requireAuth();
    const body    = await req.json().catch(() => null);
    if (!body?.price_id) {
      return NextResponse.json({ error: 'price_id is required' }, { status: 400 });
    }
    const origin = req.nextUrl.origin;
    const url = await createCheckoutSession({
      userId:     session.id,
      priceId:    String(body.price_id),
      successUrl: body.success_url ?? `${origin}/app?checkout=success`,
      cancelUrl:  body.cancel_url  ?? `${origin}/app?checkout=cancel`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? 'checkout_failed' }, { status: 500 });
  }
}
