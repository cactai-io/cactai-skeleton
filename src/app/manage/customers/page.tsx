import { requireManageRole } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

interface TenantRow {
  id:           string;
  display_name: string;
  slug:         string | null;
  status:       string;
  created_at:   string;
}

export default async function CustomersPage() {
  await requireManageRole();
  const supabase = createServiceSupabaseClient();
  const { data: tenants } = await supabase
    .from('tenants').select('id, display_name, slug, status, created_at')
    .order('created_at', { ascending: false })
    .returns<TenantRow[]>();
  return (
    <div style={{ padding:40 }}>
      <h1 style={{ fontSize:22, fontWeight:500, marginBottom:8, color:'#F5F5FA' }}>Customers</h1>
      <p style={{ fontSize:13, color:'#5A5A6E', marginBottom:32 }}>All accounts on your platform.</p>
      {!tenants?.length ? (
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:12, padding:40, textAlign:'center', color:'#5A5A6E', fontSize:13 }}>
          No customers yet.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {tenants.map((t: TenantRow) => (
            <div key={t.id} style={{ background:'rgba(255,255,255,0.02)',
              border:'1px solid rgba(255,255,255,0.06)', borderRadius:10,
              padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#F5F5FA' }}>{t.display_name}</div>
                {t.slug && <div style={{ fontSize:12, color:'#5A5A6E', fontFamily:'monospace' }}>{t.slug}</div>}
              </div>
              <div style={{ fontSize:11, padding:'3px 8px', borderRadius:4,
                background: t.status === 'active' ? 'rgba(0,214,143,0.1)' : 'rgba(255,107,53,0.1)',
                color: t.status === 'active' ? '#00D68F' : '#FF6B35' }}>
                {t.status}
              </div>
              <div style={{ fontSize:12, color:'#5A5A6E' }}>{new Date(t.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
