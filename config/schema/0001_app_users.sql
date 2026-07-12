-- 0001 — users, roles, owners (both tenancy variants; D-T80).
-- Roles are a data-driven catalog with CUMULATIVE capabilities. The multi
-- variant's hierarchy is app-owner -> tenant-admin -> user; single collapses
-- to app-owner -> user. app_owners is the developer's operation role, ABOVE
-- the app's user space — never conflated with membership.

create or replace function app_current_user_id() returns uuid language sql stable as $fn$
  select nullif(current_setting('app.user_id', true), '')::uuid
$fn$;

create table if not exists app_users (
  user_id      uuid primary key,
  email        text unique,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists role_catalog (
  role         text primary key,
  rank         int not null,
  capabilities jsonb not null default '[]'::jsonb
);

create table if not exists app_owners (
  user_id    uuid primary key references app_users(user_id),
  granted_at timestamptz not null default now()
);

create or replace function app_is_owner() returns boolean language sql stable security definer as $fn$
  select exists (select 1 from app_owners where user_id = app_current_user_id())
$fn$;

-- @prune:tenancy.multi:start
insert into role_catalog (role, rank, capabilities) values
  ('user', 0, '["read_own_data","update_own_profile"]'::jsonb),
  ('tenant-admin', 1, '["read_own_data","update_own_profile","read_tenant_users","invite_user","suspend_user","manage_tenant_settings"]'::jsonb),
  ('app-owner', 2, '["read_own_data","update_own_profile","read_tenant_users","invite_user","suspend_user","manage_tenant_settings","create_tenant","suspend_tenant","configure_app","change_billing","delete_app_data"]'::jsonb)
on conflict (role) do update set rank = excluded.rank, capabilities = excluded.capabilities;
-- @prune:tenancy.multi:end
-- @prune:tenancy.single:start
insert into role_catalog (role, rank, capabilities) values
  ('user', 0, '["read_own_data","update_own_profile"]'::jsonb),
  ('app-owner', 1, '["read_own_data","update_own_profile","read_app_users","invite_user","suspend_user","configure_app","change_billing","delete_app_data"]'::jsonb)
on conflict (role) do update set rank = excluded.rank, capabilities = excluded.capabilities;

create table if not exists app_audit_log (
  event_id  uuid primary key default gen_random_uuid(),
  actor     uuid references app_users(user_id),
  action    text not null,
  detail    jsonb,
  at        timestamptz not null default now()
);
-- @prune:tenancy.single:end

alter table app_users enable row level security;    alter table app_users force row level security;
alter table role_catalog enable row level security; alter table role_catalog force row level security;
alter table app_owners enable row level security;   alter table app_owners force row level security;

drop policy if exists app_users_self on app_users;
create policy app_users_self on app_users using (user_id = app_current_user_id() or app_is_owner());
drop policy if exists role_catalog_read on role_catalog;
create policy role_catalog_read on role_catalog using (true);
drop policy if exists app_owners_self on app_owners;
create policy app_owners_self on app_owners using (user_id = app_current_user_id());

-- @prune:tenancy.single:start
alter table app_audit_log enable row level security; alter table app_audit_log force row level security;
drop policy if exists app_audit_log_scoped on app_audit_log;
create policy app_audit_log_scoped on app_audit_log using (actor = app_current_user_id() or app_is_owner());
-- @prune:tenancy.single:end
