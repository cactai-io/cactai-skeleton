'use client';

// src/app/manage/mcp/AppShellPersonalMCPClient.tsx
//
// Client component for AppShell MCP (personal / end_user scope).
// Mounts the @cactai-io/mui MCPManager and wires it to the skeleton's
// own /api/mcp/servers CRUD (per-user table on the customer DB).
// Persistence is real; agent integration is deferred.

import React, { useCallback, useEffect, useState } from 'react';
import { MCPManager, MCP_CATALOGS, MCP_EXPLAINERS } from '@cactai-io/mui';
import type { MCPServerPublic, MCPAuthType } from '@/lib/mcp-types';

const BASE = '/api/mcp/servers';

export function AppShellPersonalMCPClient() {
  const [servers, setServers] = useState<MCPServerPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(BASE, { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `http_${r.status}`);
      setServers(j.servers ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleAdd = useCallback(async (input: {
    label: string; endpoint_url: string; auth_type: MCPAuthType; auth_token?: string;
  }) => {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...input, enabled: true }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error ?? `http_${r.status}`);
    }
    await refresh();
  }, [refresh]);

  const handleRemove = useCallback(async (id: string) => {
    const r = await fetch(`${BASE}/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j?.error ?? `http_${r.status}`);
      return;
    }
    await refresh();
  }, [refresh]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    const r = await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });
    if (!r.ok) {
      await refresh();
    }
  }, [refresh]);

  const catalog   = MCP_CATALOGS.end_user as unknown as Parameters<typeof MCPManager>[0]['catalog'];
  const explainer = [...MCP_EXPLAINERS.end_user];

  return (
    <MCPManager
      title="Your integrations"
      explainer={explainer}
      catalog={catalog}
      servers={servers}
      loading={loading}
      onAdd={handleAdd}
      onRemove={handleRemove}
      onToggle={handleToggle}
      error={error}
    />
  );
}
