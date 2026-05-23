// src/workflows/index.ts
// Workflow registry. Two sources, merged into WORKFLOWS at module evaluation:
//
//   1. Workflows the platform ships as built-ins. v1.2 has none registered
//      directly in the skeleton — built-in workflows live on the platform
//      and are pulled per-session. This static array exists so a developer
//      who wants to override a built-in can pin a frozen copy here.
//
//   2. Workflows loaded from project-library/workflows/ at startup. The
//      loader parses each *.json file, validates against WorkflowDefinition,
//      and exposes the result through getLoadedWorkflows().
//
// Conflicts on `id` resolve to first-wins, matching the tools registry.

import type { WorkflowDefinition } from '@cactai-io/types';
import { getLoadedWorkflows } from '@/lib/projectLibrary.server';

const STATIC_WORKFLOWS: WorkflowDefinition[] = [];

function mergeWorkflows(...sources: WorkflowDefinition[][]): WorkflowDefinition[] {
  const seen = new Set<string>();
  const out: WorkflowDefinition[] = [];
  for (const src of sources) {
    for (const w of src) {
      if (seen.has(w.id)) {
        // eslint-disable-next-line no-console
        console.warn(`[workflows] duplicate workflow id "${w.id}" — keeping first`);
        continue;
      }
      seen.add(w.id);
      out.push(w);
    }
  }
  return out;
}

export const WORKFLOWS: WorkflowDefinition[] = mergeWorkflows(STATIC_WORKFLOWS, getLoadedWorkflows());

export function listWorkflows(): WorkflowDefinition[] { return WORKFLOWS; }
export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}
