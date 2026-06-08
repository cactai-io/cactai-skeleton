-- 0020_stripe.sql
-- Stripe module — subscription billing. Self-contained + flag-gated ('stripe')
-- + REMOVABLE: this table set, src/lib/stripe.server.ts, and the /api/stripe/*
-- routes are declared in the feature registry (src/lib/features.ts, key
-- 'stripe') and deleted together on Remove.
--
-- stripe_customers      — maps an app user to their Stripe customer id.
-- stripe_subscriptions  — local mirror of subscription state, kept current by
--                         the webhook (the source of truth is Stripe).
--
-- Reads are owner-scoped (RLS). Writes happen through the service-role
-- connection from the webhook (Stripe is unauthenticated to our RLS).

CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id            UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  subscription_id    TEXT PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  status             TEXT NOT NULL,           -- active | trialing | past_due | canceled | ...
  price_id           TEXT,
  current_period_end TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_subscriptions_user_idx ON stripe_subscriptions(user_id);

ALTER TABLE stripe_customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Owners read their own billing rows; the webhook writes via service-role.
DROP POLICY IF EXISTS stripe_customers_owner ON stripe_customers;
CREATE POLICY stripe_customers_owner ON stripe_customers
  FOR SELECT
  USING (user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

DROP POLICY IF EXISTS stripe_subscriptions_owner ON stripe_subscriptions;
CREATE POLICY stripe_subscriptions_owner ON stripe_subscriptions
  FOR SELECT
  USING (user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid));

INSERT INTO migrations (filename, checksum, applied_at)
VALUES ('0020_stripe.sql', 'seeded', NOW())
ON CONFLICT (filename) DO NOTHING;
