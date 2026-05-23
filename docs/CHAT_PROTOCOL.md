# DevShell Chat Protocol: Conversational Authoring

This document describes the chat commands developers can use in the Cactai DevShell to load and author tools, skills, and workflows. The protocol shipped in v1.2 across Phases 2, 3, and 4.

## Overview

Six commands. Two intents (load vs author) crossed with three artifact kinds (tool, skill, workflow). All run before any model reasoning — they're recognized by pattern at the orchestrator's free-tier gate, dispatched directly to a handler in `@cactai-io/core`, and never reach the GOA stages.

```
Load tool from <pasted TypeScript source>
Load skill from <pasted SKILL.md content>
Load workflow from <pasted JSON>

Author a tool that <description>
Author a skill that <description>
Author a workflow that <description>
```

Load commands accept what you paste. Author commands ask the model to generate it. All six commands STAGE the result in the pending-edits layer; nothing reaches the dev branch until you open the pending-edits modal and commit. The staged source is visible to the agent as a pending artifact — see the "Pending vs committed" section below for what that means for invocation.

## Recognized verb variants

The recognizer is permissive on the framing verb and strict on the artifact kind:

- Load verbs: `Load`, `Add`, `Register`, `Import`
- Author verbs: `Author`, `Create`, `Build`, `Write`, `Make`
- Connector words after the verb: `from`, `using`, `with` (load); `that`, `to`, `for`, `which` (author)
- Optional `a` before the kind: both `Load tool from …` and `Load a tool from …` work

Examples that all map to the same intent:

```
Load tool from <source>
Add a tool from <source>
Register tool using <source>
Import a tool with <source>
```

The artifact kind is exact: `tool`, `skill`, `workflow` (case-insensitive, but the literal word).

## Load tool from <source>

Paste the TypeScript source of a `ToolDefinition`. The protocol:

1. Runs `validateToolSource` over the paste — confirms required fields appear, side-effect-scope and execution-weight literals are valid, no forbidden constructs (`eval`, `new Function`, `child_process`) are present. Validation errors come back as a bulleted list; nothing is staged.
2. Returns a `staged_file` payload on the turn result. The DevShell client receives this, calls `setPendingFile(path, content, { operation: 'create' })` on the staging layer, and shows the new row in the pending-edits modal.
3. Reports the path where the file will land on commit (`project-library/tools/<id>.tool.ts`) and tells you to open the pending-edits modal to review and commit.

Re-running `Load tool` on the same path simply updates the pending row — staging is idempotent on `(user, path)`. The legacy `replace` keyword is still accepted but no longer changes behavior.

Example paste:

```ts
import type { ToolDefinition } from '@cactai-io/types';

export const notesCreateTool: ToolDefinition<{ title: string; body: string }, { id: string }> = {
  id:          'notes:create',
  name:        'Create note',
  domain:      'notes',
  description: 'Create a note in the project notebook.',
  input_schema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } }, required: ['title', 'body'] },
  output_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
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

## Author a tool that <description>

Describe what the tool should do. The protocol:

1. Sends your description plus a strict system prompt (documents the ToolDefinition shape and forbids unsafe capabilities) to the model.
2. The model either returns TypeScript source or a single `ERROR: <reason>` line if the request is outside the contract (e.g. asking for arbitrary shell access).
3. If TypeScript came back, runs the same `validateToolSource` the load path uses.
4. If validation passes, returns a `staged_file` for the DevShell to stage in pending edits. Re-running on the same path updates the staged row in place.

Returns a chat message with the staged path. The source is now in the pending-edits modal — review it, commit it, wait for the deploy, then the agent can invoke it.

## Load skill from <SKILL.md content>

Paste a SKILL.md file. The protocol:

1. Runs `validateSkillSource` — parses YAML frontmatter, checks the documented keys (`id`, `name`, `priority`, `trigger`) and trigger sub-keys (`views`, `active_file_pattern`, `user_message_pattern`, `inspector_required`), compiles regex strings, confirms the body after the closing `---` is non-empty.
2. Returns a `staged_file` for the path `project-library/skills/<id>/SKILL.md`. The DevShell stages it as a pending row.

Example paste:

```markdown
---
id: note-card
name: Note Card Skill
priority: 0
trigger:
  views: ['dev']
  user_message_pattern: '(note|notes|notebook)'
---

# Note Card Skill

When the user asks anything about notes, prefer rendering output as a NoteCard
artifact. Include the title, body, and an inline edit affordance.

[…rest of the SKILL.md prose…]
```

Multi-file paste (SKILL.md plus an associated `.tsx` component) is out of scope for v1.2. When you need a component file, drop it into `src/skills/` and register it via the existing `SKILLS` map in `src/skills/index.ts`.

## Author a skill that <description>

Same shape as authoring a tool. The system prompt documents the SKILL.md format, instructs the model to emit only the file content (no markdown fences), and forbids unbounded triggers.

```
Author a skill that renders any "form" artifact with a two-column layout and inline validation messages
```

## Load workflow from <JSON>

Paste a `WorkflowDefinition`. The protocol:

1. JSON.parse the paste; parse errors come back verbatim.
2. Strip any `source` field — that's loader-set provenance, not developer-set.
3. `validateWorkflowDefinition` — confirms `schema_version: 1`, unique step ids, all `depends_on` references resolve, dependency graph is acyclic.
4. Re-stringify to canonical pretty-printed JSON before staging. The on-disk form is the same regardless of how you formatted the paste.
5. Returns a `staged_file` for the path `project-library/workflows/<id>.json`. The DevShell stages it as a pending row.

Example:

```json
{
  "id":             "onboarding-flow",
  "name":           "User onboarding",
  "description":    "Walk a new user through account setup, preferences, and first action.",
  "schema_version": 1,
  "steps": [
    {
      "id":      "welcome",
      "label":   "Welcome",
      "prompt":  "Greet the user and explain what they're about to set up.",
      "tools":   [],
      "skills":  ["chat_thread"]
    },
    {
      "id":         "preferences",
      "label":      "Preferences",
      "prompt":     "Ask about notification, theme, and language preferences.",
      "depends_on": ["welcome"],
      "tools":      [],
      "skills":     ["form"]
    }
  ]
}
```

## Author a workflow that <description>

Same shape as authoring a tool or skill. The system prompt names the v1.2 constraints (`schema_version: 1`, no per-step granular tool/skill selection, advisory-only `tools`/`skills` arrays) and instructs the model to leave those arrays empty unless the description calls them out.

```
Author a workflow that walks a new admin through setting up roles, inviting collaborators, and confirming the first sprint
```

## When the file lands

All six commands stage the result in the pending-edits layer and return a chat message that names the path it'll land on after commit. To actually move the file into the dev branch, open the pending-edits modal from the file-tree panel header and click "Commit to dev". The commit makes one atomic git commit through the GitHub API and clears the pending row.

### Code edits require commit + deploy

Code edits (`*.ts`, `*.tsx`, `*.py`, `*.json` outside `skeleton.config.json`, etc.) cannot preview live in the role-view without a Vercel rebuild. After you commit, the platform's deploy indicator (next to the SyncIndicator at the top of the Files panel) turns amber while Vercel rebuilds, then green when the new code is live. The DevShell auto-reloads 500 ms after the green transition so the role-view re-mounts against the now-deployed code.

Config-token edits and `skeleton.config.json` patches DO preview live — they're CSS-variable substitutions or runtime-read config, and the role-view re-applies them as soon as the staging layer writes. The file-tree's per-row live-preview indicator (green dot vs amber dot) tells you which behavior applies for any given pending file at the moment of the edit.

## Pending vs committed

The agent sees every dev-authored artifact with a status flag:

- **committed** — the artifact lives on the dev branch and is loaded by the skeleton's startup. The agent can invoke it normally.
- **pending** — the artifact has a staged row in `pending_files` but no commit yet. The agent MUST NOT invoke it; the system prompt tells it to ask you to commit first.

If you stage an Author/Load result and immediately ask the agent to invoke it, the agent will respond with something like:

> The tool 'foo' is staged in pending edits but hasn't been committed to dev yet. Open the pending-edits modal in the file-tree panel header and commit it, then ask me again — once it's live I can invoke it.

That's intentional. The runtime only knows about committed code; an attempt to invoke a pending tool would fail with a "tool not found" error from the orchestrator. The system prompt's pre-emptive deferral keeps you from learning that the hard way.

The agent's view refreshes via the Supabase-backed inventory (`SupabaseProjectLibraryInventory`) which reads the dev tree + your `pending_files` and merges per-id, with status tagged from the source. A 60-second cache sits in front of that read; in practice a staged artifact appears in the agent's view by the next turn, but worst case it lags by a minute.

## Failure modes

- Validation errors land in the chat reply as a bulleted list. Each entry names the field and the specific problem (`tool source is missing required field "side_effect_scope"`).
- Infrastructure failures (Supabase staging write rejected, network down) come back as a generic "couldn't stage — try again" message. The specific error is in server logs.
- Author flows return `ERROR: <reason>` when the model declines a request outside its contract. Common causes: asking for capabilities the ToolDefinition shape doesn't permit (shell execution, raw filesystem access), asking for skill triggers that have no predicate, asking for workflows that can't be expressed as a step sequence.
- Re-running `Load` or `Author` on the same id simply updates the staged pending row. Staging is idempotent on `(user, path)`. The legacy `replace` keyword is still accepted but no longer changes behavior.

## Where this protocol's code lives

Recognition + dispatch + handler logic:
- `packages/core/src/orchestration/AuthoringHandler.ts` — recognizer, dispatcher, per-kind handlers. The v1.2 commit-flow rebuild changed the post-recognition path: handlers now return `staged_file?: StagedFile` on the `AuthoringResponse` instead of calling a persistence interface. The chat-side SSE handler in the skeleton routes this `staged_file` into the client staging module, which stages it as a pending row for review in the pending-edits modal.

Validators (pure, shared with the skeleton's startup loader):
- `packages/types/src/toolSource.validate.ts`
- `packages/types/src/skillSource.validate.ts`
- `packages/types/src/projectLibrary.validate.ts` — `validateWorkflowDefinition` lives here

Staging (replaces the deleted auto-commit persistence layer):
- `packages/mui/src/staging/PendingFilesManager.ts` — client staging module. localStorage + debounced Supabase flush. Discrete events (chat-side Author/Load) bypass the debounce; the resulting row appears in pending-edits like every other edit.
- `cactai-skeleton/src/app/api/pending/files/route.ts` — `GET` (hydrate) and `POST` (flush) for `pending_files` rows.
- `cactai-skeleton/src/app/api/pending/files/[path]/route.ts` — `DELETE` for discards.
- `cactai-skeleton/src/app/api/pending/flush/route.ts` — beacon bulk upsert at tab close.
- `cactai-skeleton/config/schema/0002_pending_edits.sql` — `pending_files`, `commit_log`, `commit_log_files` tables.

Read-side inventory:
- `packages/core/src/project/ProjectLibraryInventory.ts` — `IProjectLibraryInventory` interface. Each entry now carries `status: 'committed' | 'pending'`. The Supabase-backed implementation lands in `cactai-platform-repo/apps/api/src/project-library/SupabaseProjectLibraryInventory.ts` (Task 6 of the v1.2 stage-2 rebuild). It merges the dev branch tree with the developer's `pending_files` and caches per project for 60 seconds.

Skeleton-side loader (picks up artifacts on app startup):
- `cactai-skeleton/src/lib/projectLibrary.server.ts`
- `cactai-skeleton/src/tools/index.ts`, `src/skills/index.ts`, `src/workflows/index.ts`

Deleted in the v1.2 commit-flow rebuild and not replaced in this bundle:
- `apps/api/src/github/GitHubProjectLibraryStore.ts` (the auto-commit GitHub writer).
- `apps/api/src/project-library/SkeletonProjectLibraryInventory.ts` (the HTTP-backed inventory; replaced by `SupabaseProjectLibraryInventory.ts`).
- `cactai-skeleton/src/app/api/project-library/route.ts` (the inventory endpoint the HTTP-backed implementation read; the new inventory queries the developer's Supabase directly via `getDeveloperSupabasePool`).
