// scripts/seed.ts
// Seed script — run once after provisioning to set up the developer's app database.
// Usage: npm run seed
//
// Creates:
//   - Developer's identity row in app_users
//   - Platform role (dev) in platform_roles
//   - Default tenant memberships so the dev can preview all role UIs
//   - Default tenant
//   - App roles definitions
//
// Idempotent — safe to run multiple times.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? process.env.NEXT_PUBLIC_SUPABASE_URL_DEV  ?? '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY      ?? process.env.SUPABASE_SERVICE_KEY_DEV       ?? '';
const DEV_EMAIL     = process.env.DEV_ACCOUNT_EMAIL         ?? '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function seed() {
  console.log('Seeding database…');

  // 1. App roles
  const defaultRoles = [
    { role_name: 'super_admin', capabilities: ['manage_users','manage_billing','manage_config','view_reports','manage_content'], is_system: true },
    { role_name: 'admin',       capabilities: ['manage_content','view_reports','manage_users'],                                  is_system: true },
    { role_name: 'user',        capabilities: ['view_content','submit_input','manage_own_profile'],                              is_system: true },
  ];

  for (const role of defaultRoles) {
    const { error } = await supabase.from('app_roles').upsert(role, { onConflict: 'role_name' });
    if (error) console.warn(`  app_roles [${role.role_name}]:`, error.message);
    else       console.log(`  ✓ app_role: ${role.role_name}`);
  }

  // 2. Default tenant
  let tenantId: string | null = null;
  const { data: existingTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();

  if (!existingTenant) {
    const { data: newTenant, error } = await supabase
      .from('tenants')
      .insert({ display_name: 'Default', status: 'active' })
      .select('id')
      .single();
    if (error) console.warn('  tenant insert:', error.message);
    else { tenantId = newTenant.id; console.log('  ✓ default tenant created'); }
  } else {
    tenantId = existingTenant.id;
    console.log('  ✓ tenant already exists');
  }

  // 3. Developer account
  if (!DEV_EMAIL) {
    console.log('  DEV_ACCOUNT_EMAIL not set — skipping dev user seed.');
    return;
  }

  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.warn('  Could not list auth users:', listErr.message); return; }

  const devUser = users.users.find((u: { email?: string }) => u.email === DEV_EMAIL);
  if (!devUser) {
    console.warn(`  Dev user not found for email: ${DEV_EMAIL}`);
    console.warn('  Run the provisioning wizard to create the dev auth user.');
    return;
  }

  // app_users identity row
  const { error: appUserErr } = await supabase
    .from('app_users')
    .upsert({ id: devUser.id, email: devUser.email ?? '' }, { onConflict: 'id' });
  if (appUserErr) console.warn('  app_users upsert:', appUserErr.message);
  else            console.log(`  ✓ app_user: ${DEV_EMAIL}`);

  // platform_role: dev
  const { error: prErr } = await supabase
    .from('platform_roles')
    .upsert({ user_id: devUser.id, role: 'dev' }, { onConflict: 'user_id,role' });
  if (prErr) console.warn('  platform_roles upsert:', prErr.message);
  else       console.log('  ✓ platform_role: dev');

  // Tenant memberships for all roles so dev can preview them all
  if (tenantId) {
    for (const role of ['super_admin', 'admin', 'user'] as const) {
      const { error: tmErr } = await supabase
        .from('tenant_members')
        .upsert({
          user_id:    devUser.id,
          tenant_id:  tenantId,
          role,
          status:     'active',
          accepted_at: new Date().toISOString(),
        }, { onConflict: 'user_id,tenant_id' });
      // Only insert the first role (super_admin) via upsert — for others insert separately
      if (tmErr) {
        // Try inserting if upsert fails due to unique constraint
        await supabase.from('tenant_members').insert({
          user_id: devUser.id, tenant_id: tenantId, role, status: 'active',
          accepted_at: new Date().toISOString(),
        }).then((r: { error: { message: string } | null }) => {
          if (r.error) console.warn(`  tenant_member [${role}]:`, r.error.message);
          else         console.log(`  ✓ tenant_member: ${role}`);
        });
      } else {
        console.log(`  ✓ tenant_member: ${role}`);
      }
    }
  }

  console.log('\nSeed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
