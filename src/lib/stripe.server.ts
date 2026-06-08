// src/lib/stripe.server.ts
// Stripe module — client + checkout/portal + webhook sync.
//
// Self-contained + flag-gated ('stripe') + REMOVABLE: one of the module's
// `files` in the feature registry (src/lib/features.ts); deleted on Remove.
//
// Requires env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Subscription state
// lives in Stripe; stripe_subscriptions is a local mirror the webhook keeps
// current (written via the service-role connection).

import 'server-only';
import Stripe from 'stripe';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

let _client: Stripe | null = null;

export function stripe(): Stripe {
  if (!_client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _client = new Stripe(key);
  }
  return _client;
}

/** Look up (or lazily create) the Stripe customer for an app user. */
export async function getOrCreateCustomer(userId: string): Promise<string> {
  const supabase = createServiceSupabaseClient();

  const { data: existing } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;

  const customer = await stripe().customers.create({ metadata: { app_user_id: userId } });
  await supabase.from('stripe_customers').insert({
    user_id:            userId,
    stripe_customer_id: customer.id,
  });
  return customer.id;
}

export interface CheckoutInput {
  userId:     string;
  priceId:    string;
  successUrl: string;
  cancelUrl:  string;
}

/** Start a subscription Checkout session; returns the hosted URL to redirect to. */
export async function createCheckoutSession(input: CheckoutInput): Promise<string> {
  const customer = await getOrCreateCustomer(input.userId);
  const session  = await stripe().checkout.sessions.create({
    mode:        'subscription',
    customer,
    line_items:  [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url:  input.cancelUrl,
  });
  if (!session.url) throw new Error('checkout session has no url');
  return session.url;
}

/** Open the Stripe billing portal for self-service management. */
export async function createPortalSession(userId: string, returnUrl: string): Promise<string> {
  const customer = await getOrCreateCustomer(userId);
  const session  = await stripe().billingPortal.sessions.create({
    customer,
    return_url: returnUrl,
  });
  return session.url;
}

/** Verify + parse a webhook payload. Throws if the signature is invalid. */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}

/** Sync local subscription mirror from a subscription lifecycle event. */
export async function syncSubscriptionEvent(event: Stripe.Event): Promise<void> {
  if (!event.type.startsWith('customer.subscription.')) return;

  const sub      = event.data.object as Stripe.Subscription;
  const supabase = createServiceSupabaseClient();

  const { data: customerRow } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', sub.customer as string)
    .maybeSingle();
  if (!customerRow?.user_id) return; // unknown customer — nothing to mirror

  if (event.type === 'customer.subscription.deleted') {
    await supabase.from('stripe_subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('subscription_id', sub.id);
    return;
  }

  await supabase.from('stripe_subscriptions').upsert({
    subscription_id:    sub.id,
    user_id:            customerRow.user_id,
    stripe_customer_id: sub.customer as string,
    status:             sub.status,
    price_id:           sub.items.data[0]?.price?.id ?? null,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at:         new Date().toISOString(),
  });
}
