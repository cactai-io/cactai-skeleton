-- 0013_support.sql
-- Support — in-app, two-way support conversations between the deployed app's
-- end users and the developer's operators (the Portal Support section on the
-- Cactai platform). Ships in the skeleton so every provisioned app has support
-- available on day one — no later retrofit to deployed apps.
--
-- Direction of access:
--   - END USERS open tickets and chat from inside the deployed app
--     (src/app/api/support/* under their own session).
--   - OPERATORS (the developer + scoped Portal staff) read and reply from the
--     platform Portal Support section, via getDeveloperSupabasePool (service
--     role). Operators are Cactai users, not app_users — their identity is
--     recorded in support_messages.operator_ref as 'platform:<cactai_uid>',
--     mirroring the audit_log actor convention.
--
-- RLS: ENABLE with no explicit policy — accessed via the skeleton's
-- /api/support/* routes (service-role client; the route scopes each end user to
-- their own tenant's tickets) and the platform Portal (service role). Same
-- access model as end_user_mcp_servers + every other dev-tooling table.

CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  created_by      UUID          REFERENCES app_users(id) ON DELETE SET NULL,
                  -- The end user who opened the ticket. SET NULL keeps the
                  -- ticket + history if the user is later deleted.
  subject         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
                  -- open = awaiting first operator reply; pending = waiting on
                  -- the end user; resolved/closed = done.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                  -- Denormalized for cheap "most recently active" ordering in
                  -- both the end-user list and the Portal inbox.
);

CREATE TABLE IF NOT EXISTS support_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_kind  TEXT NOT NULL CHECK (author_kind IN ('end_user', 'operator')),
  author_id    UUID REFERENCES app_users(id) ON DELETE SET NULL,
               -- The app_user who wrote it when author_kind='end_user'.
               -- NULL for operator messages (operators are Cactai users).
  operator_ref TEXT,
               -- 'platform:<cactai_uid>' when author_kind='operator'.
               -- NULL for end-user messages.
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant
  ON support_tickets (tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator
  ON support_tickets (created_by, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON support_messages (ticket_id, created_at ASC);

ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- updated_at auto-bump on tickets — same trigger pattern as other customer-DB
-- tables. (Messages are append-only; no updated_at.)
CREATE OR REPLACE FUNCTION bump_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION bump_support_tickets_updated_at();
