// src/app/manage/skill-reports/page.tsx
//
// v1.3.5 — Developer management-panel report view. DORMANT in v1.
//
// Surfaces the slice of skill_reports the developer owns:
// skill_source='developer_written' for their tenant. In v1 the marketplace
// is Cactai-supplied and there are no developer-authored skills — so this
// view is empty by design. The page is built now so v2 (when developers
// can author and publish their own skills) is an addition, not a refactor.
//
// Cactai-owned report buckets ('configured', 'generated', 'tier_2_fallback',
// 'marketplace') do NOT appear here — they route to the Cactai admin
// SkillReview tool. Generated skills RUN inside this developer's app, but
// reports about them are Cactai's. The deployed app does NOT decide;
// skill_source is the routing key.

import { requireManageRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';

interface SkillReportRow {
  id:            string;
  skill_id:      string;
  skill_source:  string;
  artifact_type: string | null;
  platform:      string | null;
  project_id:    string | null;
  session_id:    string | null;
  note:          string | null;
  resolved_at:   string | null;
  created_at:    string;
}

async function fetchReports(): Promise<SkillReportRow[]> {
  if (!endpoints.cactaiApiKey) return [];
  try {
    const res = await fetch(`${endpoints.cactaiBase}/v1/manage/skill-reports`, {
      headers: { Authorization: `Bearer ${endpoints.cactaiApiKey}` },
      cache:   'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json() as { reports: SkillReportRow[] };
    return data.reports ?? [];
  } catch {
    return [];
  }
}

export default async function SkillReportsPage() {
  await requireManageRole();
  const reports = await fetchReports();

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
          Skill reports
        </div>
        <div style={{ fontSize: 13, color: '#8B8B9F' }}>
          End-user reports about skills you authored. {reports.length} {reports.length === 1 ? 'report' : 'reports'}.
        </div>
      </div>

      <div style={{
        background: 'rgba(255, 200, 100, 0.06)',
        border: '1px solid rgba(255, 200, 100, 0.18)',
        borderRadius: 12,
        padding: 16,
        fontSize: 12,
        color: '#C4A86A',
        marginBottom: 24,
      }}>
        <strong>This view is dormant in v1.</strong> The Cactai marketplace is currently
        Cactai-supplied; developer-authored skills (and the reports about them) arrive in v2.
        Reports about generated and library skills running in your app surface in the Cactai
        admin SkillReview tool, not here — by design.
      </div>

      {reports.length === 0 ? (
        <div style={{
          background: '#13131F',
          border: '1px solid #1E1E2E',
          borderRadius: 12,
          padding: 32,
          color: '#5A5A6E',
          fontSize: 13,
        }}>
          No reports. (Expected in v1 — no developer-authored skills yet.)
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {reports.map(r => (
            <div key={r.id} style={{
              background: '#13131F',
              border: '1px solid #1E1E2E',
              borderRadius: 8,
              padding: '14px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <code style={{ fontSize: 13 }}>{r.skill_id}</code>
                <span style={{ fontSize: 11, color: '#5A5A6E' }}>
                  {r.artifact_type ?? '—'} · {r.platform ?? '—'}
                </span>
                <span style={{ fontSize: 11, color: '#5A5A6E', marginLeft: 'auto' }}>
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              {r.note && (
                <div style={{ fontSize: 12, color: '#9090A8', marginTop: 4 }}>
                  &ldquo;{r.note}&rdquo;
                </div>
              )}
              <div style={{ fontSize: 11, color: r.resolved_at ? '#00D68F' : '#FF6B35' }}>
                {r.resolved_at ? `resolved ${new Date(r.resolved_at).toLocaleDateString()}` : 'pending'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
