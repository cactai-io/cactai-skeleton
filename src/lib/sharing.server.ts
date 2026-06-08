// src/lib/sharing.server.ts
// Sharing module — create + resolve tokenised share links.
//
// Self-contained + flag-gated ('sharing') + REMOVABLE: this file is one of the
// module's `files` in the feature registry (src/lib/features.ts) and is deleted
// on Remove. Callers must gate on featureEnabled('sharing') before creating.
//
// create/list  → authed owner context (RLS-scoped to the creator).
// resolve      → PUBLIC: service-role read by token (the token is the
//                credential), so anonymous visitors can open a shared view.

import 'server-only';
import { randomBytes } from 'crypto';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase.server';
import { requireAuth } from '@/lib/auth';

export type ShareMode = 'read_only' | 'copy' | 'interactive';

export interface ShareLink {
  token:         string;
  resource_type: string;
  resource_id:   string;
  mode:          ShareMode;
  created_by:    string;
  expires_at:    string | null;
  created_at:    string;
}

export interface CreateShareLinkInput {
  resource_type: string;
  resource_id:   string;
  mode?:         ShareMode;
  /** ISO timestamp; omit for a non-expiring link. */
  expires_at?:   string | null;
}

export async function createShareLink(input: CreateShareLinkInput): Promise<ShareLink> {
  const session  = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const token    = randomBytes(16).toString('hex');

  const { data, error } = await supabase
    .from('shared_links')
    .insert({
      token,
      resource_type: input.resource_type,
      resource_id:   input.resource_id,
      mode:          input.mode ?? 'read_only',
      created_by:    session.id,
      expires_at:    input.expires_at ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ShareLink;
}

export async function listShareLinks(): Promise<ShareLink[]> {
  const session  = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('shared_links')
    .select('*')
    .eq('created_by', session.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as ShareLink[];
}

/**
 * Resolve a share link for the PUBLIC viewer. Uses the service-role connection
 * (bypasses RLS) because the visitor is anonymous — the token is the
 * credential. Returns null when the token is unknown or the link has expired.
 */
export async function resolveShareLink(token: string): Promise<ShareLink | null> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('shared_links')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!data) return null;
  const link = data as ShareLink;
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return null;
  return link;
}
