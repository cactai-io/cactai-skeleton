// src/lib/audit.server.ts
// Audit log writer. The audit_log table is defined in 0001_initial.sql with
// lens / action / target / metadata columns. Until v1.2.4 no skeleton code
// wrote to it; this helper standardizes that path.
//
// Caller contract:
//   - action is a stable string identifier ('invitation.created', 'lens.switched', etc.)
//   - target_type / target_id identify the row affected (when applicable)
//   - metadata is freeform JSON for human-readable detail
//
// Writes use the service-role client so they aren't blocked by RLS.
// Failures are logged and swallowed — audit failures must not break the
// caller's primary operation.

import 'server-only';
import { createServiceSupabaseClient } from './supabase.server';

export interface AuditOpts {
  user_id?:     string | null;
  tenant_id?:   string | null;
  lens?:        'super_admin' | 'admin' | 'user' | 'dev' | 'collaborator' | null;
  action:       string;
  target_type?: string | null;
  target_id?:   string | null;
  metadata?:    Record<string, unknown>;
}

export async function audit(opts: AuditOpts): Promise<void> {
  try {
    const supa = createServiceSupabaseClient();
    await supa.from('audit_log').insert({
      user_id:     opts.user_id     ?? null,
      tenant_id:   opts.tenant_id   ?? null,
      lens:        opts.lens        ?? null,
      action:      opts.action,
      target_type: opts.target_type ?? null,
      target_id:   opts.target_id   ?? null,
      metadata:    opts.metadata    ?? {},
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] write failed', err);
  }
}
