-- 0004 — tenant invitations (multi variant only; deleted by the single prune).

create table if not exists tenant_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(tenant_id),
  email         text not null,
  role          text not null default 'user' references role_catalog(role),
  token         text unique,
  expires_at    timestamptz not null default now() + interval '7 days',
  accepted_at   timestamptz
);

alter table tenant_invitations enable row level security;
alter table tenant_invitations force row level security;

drop policy if exists tenant_invitations_admin on tenant_invitations;
create policy tenant_invitations_admin on tenant_invitations
  using (app_member_role(tenant_id) = 'tenant-admin' or app_is_owner());
