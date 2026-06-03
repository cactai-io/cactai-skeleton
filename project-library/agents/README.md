# project-library/agents/

Developer-authored agents for this Cactai project. One Markdown file per agent.

## File convention

`project-library/agents/<id>.agent.md` — a Markdown file with YAML frontmatter
plus a system-prompt body. This mirrors the Claude / Agent-SDK sub-agent format
(and the platform's own `SKILL.md` shape), so nothing here is bespoke.

```markdown
---
name: onboarding-concierge
description: Use this agent to guide a new user through account setup and first run.
tools: data:query, comms:send_email        # optional — omit to inherit all tools
model: sonnet                               # optional — sonnet | opus | haiku | inherit
---

You are the onboarding concierge for this app. Walk a new user through setup,
ask only what you need, and hand off cleanly when they're ready.

Be concise. Never invent account state — read it with data:query first.
```

### Frontmatter

- `name` (required) — lowercase-hyphen identifier; unique within the project.
- `description` (required) — natural-language "when to use this agent." Drives
  delegation, same as a Claude sub-agent.
- `tools` (optional) — comma-separated allowlist of tool ids. Omit to inherit all.
- `model` (optional) — `sonnet` | `opus` | `haiku` | `inherit`.

The body after the frontmatter is the agent's system prompt.

## How agents get here

Same three paths as the rest of `project-library/`:

1. DevShell chat — `Load agent from …` and the agent writes the file.
2. Conversational / form authoring — describe it (or fill the Studio agent form)
   and the result lands here.
3. Direct file write — drop a `.agent.md` file in by hand. The loader picks it
   up on next startup.

## Loading

`src/lib/projectLibrary.server.ts` scans this directory at startup, parses the
frontmatter, validates `name` + `description` are present, and records each in
the project-library manifest (with a status the DevShell Library surfaces).
Malformed files are skipped with a logged error — they never crash startup.
