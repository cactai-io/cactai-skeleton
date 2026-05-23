// src/app/api/admin/refresh-capabilities/route.ts
// Super-admin-only route that invalidates the in-memory capability cache.
// Exists primarily as a documented integration point for any tool, CLI, or
// runbook that mutates the app_roles table outside the standard /api
// routes — see the contract comment in src/lib/capabilities.server.ts for
// the full rationale.
//
// Why a route at all if the function is just `cache = null`?
//   - Real caller for the hook so it doesn't bit-rot as unused export.
//   - Recovery affordance for operators who suspect cache drift in
//     production (no need for a redeploy).
//   - Forensic surface: every invocation writes an audit_log row that
//     captures actor + tenant + timestamp.
//
// Auth: super_admin lens. The route is intentionally NOT exposed via the
// app shell — it's an operator-panel / DevShell concern, surfaced from
// places that already gate by super_admin.
//
// Response: { ok, invalidated_at, audit_id }. audit_id is null when the
// audit insert fails (per the swallow-and-log contract of audit.server.ts).

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { invalidateCapabilityCache } from '@/lib/capabilities.server';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

export async function POST() {
  try {
    const session = await requireAuth();
    if (session.active_lens !== 'super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    invalidateCapabilityCache();
    const invalidatedAt = new Date().toISOString();

    // Write the audit row inline (rather than via the audit() helper) so
    // we can capture the inserted id for the response. Audit failures are
    // logged and swallowed — the cache invalidation has already happened
    // and the route should still return success.
    let auditId: number | string | null = null;
    try {
      const supa = createServiceSupabaseClient();
      const { data, error } = await supa
        .from('audit_log')
        .insert({
          user_id:     session.id,
          tenant_id:   session.tenant_id,
          lens:        'super_admin',
          action:      'capabilities.cache_invalidated',
          target_type: 'capability_cache',
          target_id:   null,
          metadata:    {},
        })
        .select('id')
        .single();
      if (!error && data) {
        auditId = (data as { id: number | string }).id;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[refresh-capabilities] audit insert failed', err);
    }

    return NextResponse.json({
      ok:              true,
      invalidated_at:  invalidatedAt,
      audit_id:        auditId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
