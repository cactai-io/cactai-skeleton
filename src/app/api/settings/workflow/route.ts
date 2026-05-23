// src/app/api/settings/workflow/route.ts
// v1.2 Thread 08 — active workflow get/swap.
//
// GET    — return the active workflow id and the list of available workflows.
// PATCH  — swap the active workflow. Substantial change; the panel surfaces
//          a confirmation modal before sending this.
//
// Built-in workflows come from the platform's catalogue. Dev-authored
// workflows are loaded by the skeleton's existing project-library loader
// and surfaced through src/workflows/index.ts.
//
// Protected: dev/collaborator only for GET, dev only for PATCH.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import {
  loadActiveWorkflowId,
  saveActiveWorkflowId,
} from '@/lib/projectDecisions.server';
import { listWorkflows } from '@/workflows/index';
import type {
  ProjectWorkflowResponse,
  ProjectWorkflowPatch,
} from '@cactai-io/types';

export async function GET() {
  try {
    await requireDevRole();

    const [activeId, builtIns] = await Promise.all([
      loadActiveWorkflowId(),
      fetchPlatformWorkflows(),
    ]);

    // Dev-authored workflows from the skeleton's local registry.
    const devAuthored = listWorkflows().map((w) => ({
      id:          w.id,
      name:        w.name,
      description: w.description,
      source:      'developer_authored' as const,
    }));

    const body: ProjectWorkflowResponse = {
      active_id: activeId,
      available: [...builtIns, ...devAuthored],
    };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'workflow_load_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }

    const patch = (await req.json()) as ProjectWorkflowPatch;
    if (!patch?.active_id || typeof patch.active_id !== 'string') {
      return NextResponse.json({ error: 'invalid_active_id' }, { status: 400 });
    }

    // Verify the requested workflow exists in the picker's set.
    const [builtIns] = await Promise.all([fetchPlatformWorkflows()]);
    const devIds     = new Set(listWorkflows().map((w) => w.id));
    const known      = new Set<string>([...builtIns.map((w) => w.id), ...devIds]);
    if (!known.has(patch.active_id)) {
      return NextResponse.json({ error: 'unknown_workflow', id: patch.active_id }, { status: 404 });
    }

    await saveActiveWorkflowId(patch.active_id);
    return NextResponse.json({ ok: true, active_id: patch.active_id });
  } catch (err) {
    return NextResponse.json(
      { error: 'workflow_update_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

async function fetchPlatformWorkflows(): Promise<Array<{
  id: string; name: string; description: string; source: 'built_in';
}>> {
  const apiKey  = endpoints.cactaiApiKey;
  const baseUrl = endpoints.cactaiBase;
  if (!apiKey) return [];

  const res = await fetch(`${baseUrl}/v1/catalogue`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next:    { revalidate: 30 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    workflows?: Array<{ id: string; name: string; description: string }>;
  };
  return (data.workflows ?? []).map((w) => ({
    id:          w.id,
    name:        w.name,
    description: w.description,
    source:      'built_in' as const,
  }));
}
