// src/tools/index.ts
// Tool registry. Two sources, merged into TOOLS at module evaluation:
//
//   1. Tools the agent has written directly into this directory during
//      workflow Stage 7. Pattern: one file per tool, registered explicitly
//      below by static import.
//
//   2. Tools loaded from project-library/tools/ at startup. The project-
//      library loader scans that directory, validates each file's
//      ToolDefinition export, and merges the results in here.
//
// Both sources share the same shape (ToolDefinition from @cactai-io/types)
// and the same registry. Conflicts on `id` resolve to first-wins; the
// project-library loader logs the duplicate and skips it.

import type { ToolDefinition } from '@cactai-io/types';
import { getLoadedTools, registerLoadedTool } from '@/lib/projectLibrary.server';

// Statically registered tools — populated by the agent.
// Example (written by agent during workflow Stage 7):
//   import { notesCreateTool } from './notes-create.tool';
//   const STATIC_TOOLS: ToolDefinition[] = [notesCreateTool];
const STATIC_TOOLS: ToolDefinition[] = [];

// Project-library tools. The loader returns whatever it discovered under
// project-library/tools/. We validate each one through registerLoadedTool();
// values that aren't valid ToolDefinitions are filtered out with a logged error.
function loadProjectLibraryTools(): ToolDefinition[] {
  const loaded = getLoadedTools();
  const out: ToolDefinition[] = [];
  for (const { id: filename, tool } of loaded) {
    const result = registerLoadedTool(filename, tool);
    if (result.ok) out.push(tool as ToolDefinition);
  }
  return out;
}

// Merged registry. First-wins on id conflicts: a tool the agent wrote into
// this directory directly takes precedence over a same-id tool from project-
// library/. Static imports here represent the "stable" set; project-library/
// is the staging area.
function mergeTools(...sources: ToolDefinition[][]): ToolDefinition[] {
  const seen = new Set<string>();
  const out: ToolDefinition[] = [];
  for (const src of sources) {
    for (const t of src) {
      if (seen.has(t.id)) {
        // eslint-disable-next-line no-console
        console.warn(`[tools] duplicate tool id "${t.id}" — keeping first`);
        continue;
      }
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

export const TOOLS: ToolDefinition[] = mergeTools(STATIC_TOOLS, loadProjectLibraryTools());
