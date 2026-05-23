# project-library/tools/

One file per tool. Filename convention: `<tool-id-slug>.tool.ts` (e.g. `notes-create.tool.ts`).

Each file exports one or more values that conform to the `ToolDefinition` interface from `@cactai-io/core/tools`. Multiple exports per file are allowed but discouraged — one tool per file makes git diffs and code review easier.

Minimal example:

```ts
import type { ToolDefinition } from '@cactai-io/types';

export const notesCreateTool: ToolDefinition<{ title: string; body: string }, { id: string }> = {
  id:          'notes:create',
  name:        'Create note',
  domain:      'notes',
  description: 'Create a note in the project notebook.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body:  { type: 'string' },
    },
    required: ['title', 'body'],
  },
  output_schema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  is_reversible:     false,
  is_idempotent:     false,
  side_effect_scope: 'internal',
  execution_weight:  'light',
  is_async:          true,
  memory: { reads: [], writes: ['notes:last_created_id'], required_scopes: [] },
  async execute(input, ctx) {
    const id = crypto.randomUUID();
    ctx.memory.set('notes:last_created_id', id);
    return { id };
  },
};
```

Anything exported from a file in this directory that is shaped like a `ToolDefinition` gets registered. Other exports are ignored.
