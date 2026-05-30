'use client';

// src/app/dev/mcp/AppShellSharedMCPClient.tsx
//
// Client component for AppShell MCP (shared / app_default scope).
// Mounts the @cactai-io/mui MCPManager and wires it to the platform's
// per-project CRUD via the /api/cactai proxy. Persistence is real;
// agent integration is deferred (memory: mcp-integration-architecture.md).

import React, { useCallback, useEffect, useState } from 'react';
import { MCPManager, MCP_CATALOGS, MCP_EXPLAINERS } from '@cactai-io/mui';
import type { MCPServerPublic, MCPAuthType } from '@/lib/mcp-types';
import { endpoints } from '@/lib/endpoints';

const SCOPE = 'app_default';
const BASE  = `/api/cactai/v1/projects/${endpoints.projectId}/mcp/${SCOPE}`;

export function AppShellSharedMCPClient() {
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

  const catalog   = MCP_CATALOGS.app_default as unknown as Parameters<typeof MCPManager>[0]['catalog'];
  const explainer = [...MCP_EXPLAINERS.app_default];

  return (
    <MCPManager
      title="Shared integrations"
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
