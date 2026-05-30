// src/app/api/mcp/servers/[id]/route.ts
//
// Per-server PATCH + DELETE for end-user MCP server registrations.
// Always scopes by the caller's session.id so users can't modify
// each other's rows.
//
// PATCH accepts a partial update (label / endpoint_url / auth_type /
// auth_token / enabled). auth_token=null OR '' clears; non-empty
// replaces (re-encrypted via the v2 envelope).
//
// DELETE removes the row outright (no soft-delete — the canonical
// list IS what the user sees in /operate/mcp; a deleted server is
// gone). The user can re-add later if they want.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';
import { encryptSecret, isEncrypted } from '@/lib/secrets.server';
import type {
  MCPAuthType,
  MCPCapabilities,
  MCPServerPublic,
} from '@/lib/mcp-types';

interface ServerRow {
  id:            string;
  user_id:       string;
  label:         string;
  endpoint_url:  string;
  auth_type:     MCPAuthType;
  auth_token:    string | null;
  enabled:       boolean;
  capabilities:  MCPCapabilities | null;
  created_at:    string;
  updated_at:    string;
}

function toPublic(r: ServerRow): MCPServerPublic {
  return {
    id:            r.id,
    label:         r.label,
    endpoint_url:  r.endpoint_url,
    auth_type:     r.auth_type,
    auth_set:      !!r.auth_token,
    enabled:       r.enabled,
    capabilities:  r.capabilities ?? undefined,
    created_at:    r.created_at,
    updated_at:    r.updated_at,
  };
}

function isHttpsUrl(s: unknown): s is string {
  return typeof s === 'string' && /^https:\/\//i.test(s);
}

function isAuthType(s: unknown): s is MCPAuthType {
  return s === 'none' || s === 'bearer' || s === 'oauth';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth();
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Partial<{
    label:        string;
    endpoint_url: string;
    auth_type:    MCPAuthType;
    auth_token:   string | null;
    enabled:      boolean;
  }>;

  const supa = createServiceSupabaseClient();

  // Load existing row to merge token semantics (null/empty clears,
  // non-empty replaces, omitted leaves alone). Service-role client
  // bypasses RLS so we scope explicitly by user_id.
  const { data: existing, error: loadErr } = await supa
    .from('end_user_mcp_servers')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.id)
    .maybeSingle();
  if (loadErr) {
    return NextResponse.json({ error: 'mcp_load_failed', detail: loadErr.message }, { status: 502 });
  }
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Validate optional fields when present.
  if (body.endpoint_url !== undefined && !isHttpsUrl(body.endpoint_url)) {
    return NextResponse.json({
      error:  'invalid_endpoint_url',
      detail: 'endpoint_url must be an https:// URL',
    }, { status: 400 });
  }
  if (body.auth_type !== undefined && !isAuthType(body.auth_type)) {
    return NextResponse.json({ error: 'invalid_auth_type' }, { status: 400 });
  }

  // Token mutation: explicit null/empty clears, non-empty sets,
  // omitted leaves unchanged. auth_type='none' implicitly clears
  // even if a token was sent (the server can never use it anyway).
  const nextAuthType: MCPAuthType = body.auth_type ?? (existing as unknown as ServerRow).auth_type;
  let nextToken: string | null = (existing as unknown as ServerRow).auth_token;
  if (nextAuthType === 'none') {
    nextToken = null;
  } else if (body.auth_token === null || body.auth_token === '') {
    nextToken = null;
  } else if (typeof body.auth_token === 'string') {
    if (isEncrypted(body.auth_token)) {
      // Already-encrypted envelope round-trip — leave as-is.
      nextToken = body.auth_token;
    } else {
      try { nextToken = await encryptSecret(body.auth_token); }
      catch (err) {
        return NextResponse.json({
          error:  'encrypt_failed',
          detail: (err as Error).message,
        }, { status: 500 });
      }
    }
  }

  const updates: Partial<ServerRow> = {
    ...(body.label        !== undefined ? { label:        body.label.trim() }   : {}),
    ...(body.endpoint_url !== undefined ? { endpoint_url: body.endpoint_url }   : {}),
    ...(body.auth_type    !== undefined ? { auth_type:    body.auth_type   }    : {}),
    ...(body.enabled      !== undefined ? { enabled:      body.enabled     }    : {}),
    auth_token: nextToken,
  };

  const { data: updated, error: updErr } = await supa
    .from('end_user_mcp_servers')
    .update(updates)
    .eq('id', id)
    .eq('user_id', session.id)
    .select('*')
    .maybeSingle();
  if (updErr) {
    const isUnique = (updErr as { code?: string }).code === '23505';
    return NextResponse.json({
      error:  isUnique ? 'duplicate_endpoint' : 'mcp_update_failed',
      detail: updErr.message,
    }, { status: isUnique ? 409 : 502 });
  }
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ server: toPublic(updated as unknown as ServerRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth();
  const { id } = await params;
  const supa = createServiceSupabaseClient();
  const { error, count } = await supa
    .from('end_user_mcp_servers')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', session.id);
  if (error) {
    return NextResponse.json({ error: 'mcp_delete_failed', detail: error.message }, { status: 502 });
  }
  if (!count) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, removed: id });
}
