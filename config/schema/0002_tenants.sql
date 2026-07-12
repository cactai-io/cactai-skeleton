-- 0002 — tenants (multi variant only; this FILE is deleted by the
-- single-tenant prune, D-T80). Provisioned from day one with per-tenant RLS.

create table if not exists tenants (
  tenant_id    uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug         text not null unique,
  status       text not null default 'active' check (status in ('active','suspended')),
  config       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- The canonical tenant-scoped app-data pattern: every app-data table carries
-- tenant_id and repeats this policy shape.
create table if not exists app_audit_log (
  event_id  uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id),
  actor     uuid references app_users(user_id),
  action    text not null,
  detail    jsonb,
  at        timestamptz not null default now()
);
