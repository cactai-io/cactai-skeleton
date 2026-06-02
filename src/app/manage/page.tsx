// src/app/manage/page.tsx
// Management panel — the developer's live app management interface.
//
// This is where the developer goes after their app is in production to:
//   - See all customer accounts (tenants)
//   - Manage tenant status (suspend, delete)
//   - View usage metrics from Supabase
//   - Access tenant detail pages
//
// This page is generated / extended by the workflow agent during the
// roles_and_access workflow step. Until then it shows a stub that
// functions as a basic tenant list.

import { requireManageRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export default async function OperatePage() {
  await requireManageRole();

  const supabase = createServiceSupabaseClient();
  const { data: tenants } = await supabase
    .from('tenant_summary')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
          Customer accounts
        </div>
        <div style={{ fontSize: 13, color: '#8B8B9F' }}>
          {tenants?.length ?? 0} accounts
        </div>
      </div>

      {(!tenants || tenants.length === 0) && (
        <div style={{
          background: '#13131F',
          border: '1px solid #1E1E2E',
          borderRadius: 12,
          padding: 32,
          color: '#5A5A6E',
          fontSize: 13,
        }}>
          No customer accounts yet. When users sign up for your app,
          their accounts will appear here.
        </div>
      )}

      {tenants && tenants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {tenants.map((tenant: Record<string, unknown>) => (
            <div key={tenant.id as string} style={{
              background: '#13131F',
              border: '1px solid #1E1E2E',
              borderRadius: 8,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {tenant.display_name as string}
                </div>
                <div style={{ fontSize: 12, color: '#5A5A6E', marginTop: 2 }}>
                  {tenant.member_count as number} member{Number(tenant.member_count) !== 1 ? 's' : ''}
                  {' · '}
                  {new Date(tenant.created_at as string).toLocaleDateString()}
                </div>
              </div>
              <div style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: tenant.status === 'active' ? 'rgba(0,214,143,0.1)' : 'rgba(255,107,53,0.1)',
                color: tenant.status === 'active' ? '#00D68F' : '#FF6B35',
              }}>
                {tenant.status as string}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, fontSize: 12, color: '#3A3A50', lineHeight: 1.7 }}>
        The workflow agent will extend this panel with full tenant management,
        usage metrics, and billing controls during the roles and access workflow step.
      </div>
    </div>
  );
}
