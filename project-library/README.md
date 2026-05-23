# project-library/

Developer-authored tools, skills, and workflows for this Cactai project.

This directory is committed to git alongside the rest of the project source. Everything inside is loaded at app startup by `src/lib/projectLibrary.server.ts` and registered into the project's tool, skill, and workflow registries — making each artifact available to the agent and selectable from Project Settings and DevShell preferences.

## How artifacts get here

Three paths:

1. The DevShell chat — paste an artifact's code in chat (`Load tool from …`, `Load skill from …`, `Load workflow from …`) and the agent writes the file into the matching subdirectory.
2. Conversational authoring — describe what you want (`Author a tool that …`, same for skill/workflow), iterate with the agent, and the result lands in the matching subdirectory.
3. Direct file write — drop a file in the right subdirectory by hand. The loader picks it up on next startup.

The chat-side protocol for paths 1 and 2 is documented in `docs/CHAT_PROTOCOL.md` at the repo root.

## Subdirectories

- `tools/` — TypeScript files exporting one or more `ToolDefinition` objects. One file per tool is the convention; multiple per file is allowed.
- `skills/` — One folder per skill. Each folder contains a `SKILL.md` (the trigger metadata and prompt content) and may contain associated `.ts`/`.tsx` files that the SKILL.md references.
- `workflows/` — JSON files. Each file is one `WorkflowDefinition`. Filename should match the workflow's `id`.

Per-subdirectory READMEs document the exact file conventions.

## Loading model

The skeleton's `src/lib/projectLibrary.server.ts` scans each subdirectory at module init and returns a typed manifest. The existing `src/tools/index.ts`, `src/skills/index.ts`, and `src/lib/workflows.ts` registries import that manifest and merge developer-authored artifacts with whatever they already register.

The loader is `server-only` — it uses `node:fs` and runs on the Next.js server. Client code that needs to know what's available reads it through the platform API, not by importing the loader directly.

## Validation

The loader validates every artifact against the relevant schema (`ToolDefinition`, `SkillRegistration`, `WorkflowDefinition`) before registration. Malformed artifacts are logged with a clear error and skipped — they do not crash startup. Errors are surfaced in the DevShell so the developer can see what failed and why.

## Versioning

Every file in this directory is regular source code under git. Treat it that way — commit changes, review PRs, roll back via git history. The agent never edits anything in here without leaving a commit message saying what it did and why.
