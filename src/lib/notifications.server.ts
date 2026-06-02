// src/lib/notifications.server.ts
// Skeleton-side notifications: emission, query, dismissal, resolution.
// Backs the bell in the management panel.
//
// Mirrors the platform-side notifications/platform.ts pattern but writes
// to the customer Supabase's app_notifications table. Recipients are app
// users (developer-as-manager, app super_admins, app admins).
//
// All writes go through the service-role client to bypass RLS; RLS still
// protects client-side reads via the policies defined in 0005_notifications.sql.

import 'server-only';
import { createServiceSupabaseClient } from './supabase.server';

export type Severity   = 'info' | 'warning' | 'error' | 'blocking';
export type ActionKind = 'info_only' | 'retry' | 'repair' | 'navigate';

export interface EmitOpts {
  /** NULL means broadcast to users with at least required_role. */
  recipient_user_id?: string | null;
  /** When recipient_user_id is null, the minimum tenant role for visibility. */
  required_role?:     'super_admin' | 'admin' | 'user' | null;

  condition_key:      string;
  severity:           Severity;
  title:              string;
  body:               string;
  action_kind?:       ActionKind;
  action_payload?:    Record<string, unknown>;
}

export interface AppNotification {
  id:               string;
  recipient_user_id: string | null;
  required_role:    string | null;
  condition_key:    string;
  severity:         Severity;
  title:            string;
  body:             string;
  action_kind:      ActionKind;
  action_payload:   Record<string, unknown>;
  created_at:       string;
  last_seen_at:     string;
  occurrence_count: number;
  dismissed_at:     string | null;
  resolved_at:      string | null;
}

/**
 * Emit a notification. Upsert semantics on (recipient_user_id, condition_key).
 * Same caller contract as the platform-side emit().
 */
export async function emit(opts: EmitOpts): Promise<void> {
  try {
    const supa = createServiceSupabaseClient();
    // Supabase JS doesn't have a native ON CONFLICT clause; use upsert.
    // The unique index on (COALESCE(recipient_user_id::text, '_broadcast'), condition_key)
    // is enforced server-side, so we replicate the key construction here.
    const recipient    = opts.recipient_user_id ?? null;
    const requiredRole = opts.required_role ?? null;

    // Check for an existing row with same recipient + condition_key
    const existing = await supa
      .from('app_notifications')
      .select('id, occurrence_count')
      .eq('condition_key', opts.condition_key)
      .is('resolved_at', null)
      .eq(recipient ? 'recipient_user_id' : 'recipient_user_id', recipient as never)
      .limit(1)
      .maybeSingle();

    if (existing.data) {
      await supa.from('app_notifications')
        .update({
          severity:         opts.severity,
          title:            opts.title,
          body:             opts.body,
          action_kind:      opts.action_kind  ?? 'info_only',
          action_payload:   opts.action_payload ?? {},
          last_seen_at:     new Date().toISOString(),
          occurrence_count: (existing.data.occurrence_count as number) + 1,
          resolved_at:      null,
        })
        .eq('id', existing.data.id as string);
    } else {
      await supa.from('app_notifications').insert({
        recipient_user_id: recipient,
        required_role:     requiredRole,
        condition_key:     opts.condition_key,
        severity:          opts.severity,
        title:             opts.title,
        body:              opts.body,
        action_kind:       opts.action_kind   ?? 'info_only',
        action_payload:    opts.action_payload ?? {},
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifications:app] emit failed', err);
  }
}

/**
 * Mark a notification resolved. Called when the underlying cause is fixed.
 */
export async function resolve(condition_key: string, recipient_user_id?: string | null): Promise<void> {
  try {
    const supa  = createServiceSupabaseClient();
    let q = supa.from('app_notifications')
      .update({ resolved_at: new Date().toISOString() })
      .eq('condition_key', condition_key)
      .is('resolved_at', null);
    if (recipient_user_id !== undefined) {
      q = recipient_user_id === null
        ? q.is('recipient_user_id', null)
        : q.eq('recipient_user_id', recipient_user_id);
    }
    await q;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifications:app] resolve failed', err);
  }
}

/**
 * List unread notifications for a recipient, ordered by severity then recency.
 */
export async function listForUser(
  user_id: string,
  active_lens: 'super_admin' | 'admin' | 'user' | null,
): Promise<AppNotification[]> {
  const supa = createServiceSupabaseClient();
  const { data } = await supa
    .from('app_notifications')
    .select('*')
    .is('resolved_at', null)
    .or(`recipient_user_id.eq.${user_id},recipient_user_id.is.null`);
  if (!data) return [];

  // Filter broadcasts by lens privilege and apply dismissed-vs-last-seen logic
  // client-side because Supabase's filter language doesn't express it cleanly.
  const rank: Record<string, number> = { user: 0, admin: 1, super_admin: 2 };
  const visible = (data as unknown as AppNotification[]).filter(n => {
    if (n.dismissed_at && new Date(n.last_seen_at) <= new Date(n.dismissed_at)) return false;
    if (n.recipient_user_id) return true; // explicit recipient
    if (!n.required_role) return true;     // broadcast to anyone
    const need = rank[n.required_role] ?? 0;
    const have = active_lens ? (rank[active_lens] ?? 0) : 0;
    return have >= need;
  });

  const sevOrder: Record<Severity, number> = { blocking: 0, error: 1, warning: 2, info: 3 };
  visible.sort((a, b) => {
    const so = sevOrder[a.severity] - sevOrder[b.severity];
    if (so !== 0) return so;
    return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
  });
  return visible;
}

export async function dismiss(notification_id: string, user_id: string): Promise<void> {
  const supa = createServiceSupabaseClient();
  await supa.from('app_notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', notification_id)
    .or(`recipient_user_id.eq.${user_id},recipient_user_id.is.null`);
}

export async function getById(notification_id: string): Promise<AppNotification | null> {
  const supa = createServiceSupabaseClient();
  const { data } = await supa.from('app_notifications')
    .select('*')
    .eq('id', notification_id)
    .maybeSingle();
  return (data as unknown as AppNotification | null) ?? null;
}
