// src/app/api/mcp/servers/route.ts
//
// End-user MCP server registry — each authenticated end user manages
// THEIR own MCP servers (their personal Notion, Linear, Postgres, etc.).
// Per-project and per-developer scope live on the platform's
// /v1/projects/:id/mcp/* routes; this is the per-user surface.
//
// Storage: end_user_mcp_servers table on the customer's Supabase
// (migration 0012_mcp_servers.sql). Auth tokens are v2-envelope-encrypted
// with the shared SECRETS_ENCRYPTION_KEY — never echoed back to the
// browser; GET returns a masked auth_set boolean only.
//
// Auth: any authenticated user. The route scopes every read/write to
// the caller's own session.id (no cross-user access).

import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';
import { encryptSecret } from '@/lib/secrets.server';
import type {
  MCPAuthType,
  MCPCapabilities,
  MCPServerPublic,
} from '@cactai-io/types';

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

// GET /api/mcp/servers — list this user's servers.
export async function GET() {
  const session = await requireAuth();
  const supa = createServiceSupabaseClient();
  const { data, error } = await supa
    .from('end_user_mcp_servers')
    .select('*')
    .eq('user_id', session.id)
    .order('created_at', { ascending: true });
  if (error) {
    return NextResponse.json({
      error:  'mcp_servers_load_failed',
      detail: error.message,
    }, { status: 502 });
  }
  return NextResponse.json({ servers: (data ?? []).map((r) => toPublic(r as unknown as ServerRow)) });
}

// POST /api/mcp/servers — add a server for this user.
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({})) as Partial<{
    label:        string;
    endpoint_url: string;
    auth_type:    MCPAuthType;
    auth_token:   string;
    enabled:      boolean;
  }>;

  if (typeof body.label !== 'string' || !body.label.trim()) {
    return NextResponse.json({ error: 'invalid_label' }, { status: 400 });
  }
  if (!isHttpsUrl(body.endpoint_url)) {
    return NextResponse.json({
      error:  'invalid_endpoint_url',
      detail: 'endpoint_url must be an https:// URL',
    }, { status: 400 });
  }
  const authType: MCPAuthType = isAuthType(body.auth_type) ? body.auth_type : 'none';

  let auth_token: string | null = null;
  if (authType !== 'none' && typeof body.auth_token === 'string' && body.auth_token.length > 0) {
    try { auth_token = await encryptSecret(body.auth_token); }
    catch (err) {
      return NextResponse.json({
        error:  'encrypt_failed',
        detail: (err as Error).message,
      }, { status: 500 });
    }
  }

  const supa = createServiceSupabaseClient();
  const row: ServerRow = {
    id:            randomUUID(),
    user_id:       session.id,
    label:         body.label.trim(),
    endpoint_url:  body.endpoint_url,
    auth_type:     authType,
    auth_token,
    enabled:       body.enabled !== false,
    capabilities:  null,
    created_at:    new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  };
  const { error } = await supa.from('end_user_mcp_servers').insert(row);
  if (error) {
    // UNIQUE (user_id, endpoint_url) violation lands here as 23505.
    const isUnique = (error as { code?: string }).code === '23505';
    return NextResponse.json({
      error:  isUnique ? 'duplicate_endpoint' : 'mcp_server_insert_failed',
      detail: error.message,
    }, { status: isUnique ? 409 : 502 });
  }
  return NextResponse.json({ server: toPublic(row) });
}
