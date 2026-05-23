// src/skills/index.ts
// Skill registry. Two sources, merged into SKILLS at module evaluation:
//
//   1. Skills the agent has written directly into this directory during
//      workflow Stage 7. Pattern: one file per skill, registered explicitly
//      below.
//
//   2. Skills loaded from project-library/skills/ at startup. The project-
//      library loader scans subfolders for SKILL.md, parses frontmatter +
//      content, and exposes the result through getLoadedSkills().
//
// Activation is explicit — the agent activates skills from Settings in the
// dev shell. Only one skill per artifact type can be active at a time.
//
// Naming note: this registry mirrors @cactai-io/agent-skills' SkillRegistration
// shape for project-authored skills (markdown content + trigger metadata
// for the agent's system prompt). UI-rendering skills (SKILLS.note_card =
// React component) keep the old key-value shape via STATIC_UI_SKILLS.

import { getLoadedSkills, type LoadedSkillRecord } from '@/lib/projectLibrary.server';

// ── UI skills (existing convention) ─────────────────────────────────────────
//
// Maps artifact_type → React component or descriptor. The dev agent writes
// here when it authors a new artifact-rendering skill.
//
// Example registration (written by agent):
//   import { NoteCardSkill } from './NoteCard.skill';
//   const STATIC_UI_SKILLS: Record<string, unknown> = { note_card: NoteCardSkill };

const STATIC_UI_SKILLS: Record<string, unknown> = {};

export const SKILLS: Record<string, unknown> = { ...STATIC_UI_SKILLS };

// ── Agent skills (markdown + trigger metadata) ──────────────────────────────
//
// Returned to the platform on session open so the agent's system prompt
// assembler (@cactai-io/agent-skills) can inject the right content when triggers
// fire for this project.

export interface ProjectAgentSkill {
  id:                   string;
  name:                 string;
  priority:             number;
  trigger: {
    views?:                string[];
    active_file_pattern?:  string;  // serialized for transport
    user_message_pattern?: string;
    inspector_required?:   boolean;
  };
  content:              string;
}

function serializeSkill(s: LoadedSkillRecord): ProjectAgentSkill {
  return {
    id:       s.id,
    name:     s.name,
    priority: s.priority,
    trigger: {
      views:                s.trigger.views,
      active_file_pattern:  s.trigger.active_file_pattern  ? s.trigger.active_file_pattern.source  : undefined,
      user_message_pattern: s.trigger.user_message_pattern ? s.trigger.user_message_pattern.source : undefined,
      inspector_required:   s.trigger.inspector_required,
    },
    content:  s.content,
  };
}

export function listProjectAgentSkills(): ProjectAgentSkill[] {
  return getLoadedSkills().map(serializeSkill);
}
