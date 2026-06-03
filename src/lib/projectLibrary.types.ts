// src/lib/projectLibrary.types.ts
// Shared types for the project-library loader. Pure types — no runtime code,
// safe to import from client modules that need to render manifest data.
//
// Authority: see project-library/README.md for the loading model.

import type { WorkflowDefinition } from '@cactai-io/types';

// ── Tool manifest entry ──────────────────────────────────────────────────────
// One per file in project-library/tools/. The actual ToolDefinition lives at
// the file path on disk; the manifest carries identity + the validation result
// so the registry can surface load failures without crashing startup.
export interface LoadedToolEntry {
  // Tool id pulled from the ToolDefinition once the file's been imported and
  // validated. Empty string when the file failed to load (see `error`).
  tool_id:    string;
  // Absolute path to the source file under project-library/tools/.
  file_path:  string;
  // 'ok' when validation passed and the tool is registered.
  // 'error' when something failed; the entry is still in the manifest so the
  // DevShell can surface the failure to the developer.
  status:     'ok' | 'error';
  // Set when status === 'error'. Human-readable, includes file path and the
  // specific shape mismatch that caused the rejection.
  error?:     string;
}

// ── Skill manifest entry ─────────────────────────────────────────────────────
// One per folder in project-library/skills/. Mirrors LoadedToolEntry's shape.
export interface LoadedSkillEntry {
  skill_id:    string;
  folder_path: string;
  status:      'ok' | 'error';
  error?:      string;
}

// ── Workflow manifest entry ──────────────────────────────────────────────────
// One per .json file in project-library/workflows/. The parsed definition is
// inlined since workflows are pure data (unlike tools/skills which carry code).
export interface LoadedWorkflowEntry {
  workflow_id: string;
  file_path:   string;
  status:      'ok' | 'error';
  // Present when status === 'ok'.
  definition?: WorkflowDefinition;
  error?:      string;
}

// ── Agent manifest entry ─────────────────────────────────────────────────────
// One per <id>.agent.md in project-library/agents/. Mirrors a Claude sub-agent
// / SKILL.md: frontmatter (name, description, tools?, model?) + system-prompt
// body. Only identity + status live on the manifest.
export interface LoadedAgentEntry {
  agent_id:    string;
  file_path:   string;
  status:      'ok' | 'error';
  error?:      string;
}

// ── Character manifest entry ─────────────────────────────────────────────────
// One per folder in project-library/characters/. Each holds the SVG +
// character.json (PersonalityCharacter) + animations.css.
export interface LoadedCharacterEntry {
  character_id: string;
  folder_path:  string;
  status:       'ok' | 'error';
  error?:       string;
}

export interface ProjectLibraryManifest {
  tools:      LoadedToolEntry[];
  skills:     LoadedSkillEntry[];
  workflows:  LoadedWorkflowEntry[];
  agents:     LoadedAgentEntry[];
  characters: LoadedCharacterEntry[];
  // Timestamp when the manifest was built. The loader is called once per
  // process startup; subsequent reads return the same manifest.
  loaded_at: string;
}
