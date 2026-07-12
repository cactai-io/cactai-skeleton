-- 0003 — tenant membership (multi variant only; deleted by the single prune).
-- One role per member per tenant, FK to the role catalog.

create table if not exists tenant_members (
  user_id    uuid not null references app_users(user_id),
  tenant_id  uuid not null references tenants(tenant_id),
  role       text not null default 'user' references role_catalog(role),
  status     text not null default 'active' check (status in ('active','suspended','removed')),
  invited_at timestamptz,
  joined_at  timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- SECURITY DEFINER: policies read membership without re-entering this table's own RLS.
create or replace function app_member_role(t uuid) returns text language sql stable security definer as $fn$
  select tm.role from tenant_members tm
  where tm.user_id = app_current_user_id() and tm.tenant_id = t and tm.status = 'active'
$fn$;

alter table tenants enable row level security;        alter table tenants force row level security;
alter table tenant_members enable row level security; alter table tenant_members force row level security;
alter table app_audit_log enable row level security;  alter table app_audit_log force row level security;

drop policy if exists tenants_member_read on tenants;
create policy tenants_member_read on tenants
  using (app_member_role(tenant_id) is not null or app_is_owner());

drop policy if exists tenant_members_scoped on tenant_members;
create policy tenant_members_scoped on tenant_members
  using (user_id = app_current_user_id() or app_member_role(tenant_id) = 'tenant-admin' or app_is_owner());

drop policy if exists app_audit_log_tenant on app_audit_log;
create policy app_audit_log_tenant on app_audit_log
  using (app_member_role(tenant_id) is not null or app_is_owner());
