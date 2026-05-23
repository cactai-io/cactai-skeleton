# project-library/skills/

One folder per skill. Folder name is the skill id (e.g. `note-card/`).

Each skill folder contains:

- `SKILL.md` — required. Frontmatter-style metadata in YAML at the top, followed by the markdown content the agent's system prompt sees when this skill's trigger fires.
- Any associated `.ts` / `.tsx` files the SKILL.md references for client-side rendering.

`SKILL.md` shape:

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

Trigger fields mirror the `SkillTrigger` interface from `@cactai-io/agent-skills`:

- `views` — array of DevShell view names; the skill fires only in those views.
- `active_file_pattern` — regex (as string) matched against the active file path.
- `user_message_pattern` — regex (as string) matched against the turn input.
- `inspector_required` — boolean; fires when an inspector context is present.

A skill with no trigger fields fires unconditionally (rare; reserve for safety/policy injections).

`priority` is optional and defaults to 0. Higher priority skills appear earlier in the injected block. 100+ is reserved for platform-level safety skills; negative values are for fallbacks.

Validation rejects: missing required fields, regex patterns that don't compile, unknown YAML keys at the top level, and duplicate ids across the registry.
