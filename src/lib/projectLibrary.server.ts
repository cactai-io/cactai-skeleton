// src/lib/projectLibrary.server.ts
// Server-side loader for project-library/ artifacts. Discovers tools,
// skills, and workflows under project-library/ at the repo root, validates
// them, and returns a typed manifest that the existing registries consume.
//
// Server-only. Uses node:fs and runs in the Next.js server runtime.
//
// Authority: see project-library/README.md for the loading model.
//
// Discovery model:
//   - project-library/tools/      *.tool.ts files; one or more named exports
//                                 that pass looksLikeToolDefinition() are
//                                 registered. Other exports ignored.
//   - project-library/skills/     subfolders, each containing SKILL.md;
//                                 frontmatter parsed for trigger metadata,
//                                 body becomes the content injected into
//                                 the system prompt.
//   - project-library/workflows/  *.json files; one WorkflowDefinition per
//                                 file. Filename should match the id but
//                                 mismatches are tolerated with a warning.
//
// Failure model: every file is validated independently. A malformed artifact
// is skipped, a typed error is recorded on its manifest entry, and a single
// console.error is emitted at startup. Startup never crashes because one
// dev-authored file has a bug — the rest of the app continues to load.

import 'server-only';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  LoadedToolEntry,
  LoadedSkillEntry,
  LoadedWorkflowEntry,
  LoadedAgentEntry,
  LoadedCharacterEntry,
  ProjectLibraryManifest,
} from './projectLibrary.types';
import {
  validateToolDefinition,
  looksLikeToolDefinition,
  validateSkillFrontmatter,
  validateWorkflowDefinition,
  parseSkillMd,
} from './projectLibrary.validate';
import type { WorkflowDefinition } from '@cactai-io/types';

// Project root is two levels up from src/lib/. This matches the layout
// described in project-library/README.md.
const PROJECT_ROOT     = resolve(process.cwd());
const LIBRARY_ROOT     = join(PROJECT_ROOT, 'project-library');
const TOOLS_DIR        = join(LIBRARY_ROOT, 'tools');
const SKILLS_DIR       = join(LIBRARY_ROOT, 'skills');
const WORKFLOWS_DIR    = join(LIBRARY_ROOT, 'workflows');
const AGENTS_DIR       = join(LIBRARY_ROOT, 'agents');
const CHARACTERS_DIR   = join(LIBRARY_ROOT, 'characters');

// One-shot init cache. The manifest is built once per process and reused;
// dev mode hot-reload restarts the server which rebuilds it.
let cachedManifest: ProjectLibraryManifest | null = null;
let cachedToolMap:   Map<string, unknown>          = new Map();
let cachedSkillMap:  Map<string, LoadedSkillRecord> = new Map();
let cachedWorkflows: Map<string, WorkflowDefinition> = new Map();

// Internal: a fully resolved skill with both metadata and content.
// The agent-skills package uses this to register the skill in the running
// process.
export interface LoadedSkillRecord {
  id:                    string;
  name:                  string;
  priority:              number;
  trigger: {
    views?:                string[];
    active_file_pattern?:  RegExp;
    user_message_pattern?: RegExp;
    inspector_required?:   boolean;
  };
  content:               string;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function loadProjectLibrary(): ProjectLibraryManifest {
  if (cachedManifest) return cachedManifest;
  cachedManifest = buildManifest();
  return cachedManifest;
}

// Per-artifact accessors. The registries call these after loadProjectLibrary()
// has run. Tools and skills come back as actual runtime values; workflows as
// validated definitions.
export function getLoadedTools(): Array<{ id: string; tool: unknown }> {
  ensureLoaded();
  return [...cachedToolMap.entries()].map(([id, tool]) => ({ id, tool }));
}

export function getLoadedSkills(): LoadedSkillRecord[] {
  ensureLoaded();
  return [...cachedSkillMap.values()];
}

export function getLoadedWorkflows(): WorkflowDefinition[] {
  ensureLoaded();
  return [...cachedWorkflows.values()];
}

function ensureLoaded(): void {
  if (!cachedManifest) loadProjectLibrary();
}

// ── Manifest construction ───────────────────────────────────────────────────

function buildManifest(): ProjectLibraryManifest {
  if (!existsSync(LIBRARY_ROOT)) {
    // Fresh skeleton clones may not have project-library/ yet. Returning
    // an empty manifest is the right behavior — nothing to register.
    return { tools: [], skills: [], workflows: [], agents: [], characters: [], loaded_at: new Date().toISOString() };
  }

  const tools      = loadTools();
  const skills     = loadSkills();
  const workflows  = loadWorkflows();
  const agents     = loadAgents();
  const characters = loadCharacters();

  // Single aggregated startup log. Per-file errors were already logged
  // individually in the load functions; this gives ops a one-line summary.
  const errorCount =
    tools.filter((t) => t.status === 'error').length
    + skills.filter((s) => s.status === 'error').length
    + workflows.filter((w) => w.status === 'error').length
    + agents.filter((a) => a.status === 'error').length
    + characters.filter((c) => c.status === 'error').length;
  // eslint-disable-next-line no-console
  console.log(
    `[project-library] loaded ${tools.length} tool(s), ${skills.length} skill(s), `
    + `${workflows.length} workflow(s), ${agents.length} agent(s), ${characters.length} character(s)`
    + (errorCount > 0 ? ` — ${errorCount} validation error(s); check earlier logs` : ''),
  );

  return {
    tools,
    skills,
    workflows,
    agents,
    characters,
    loaded_at: new Date().toISOString(),
  };
}

// ── Agent loading ────────────────────────────────────────────────────────────
//
// Each <id>.agent.md is parsed for frontmatter (reusing the SKILL.md parser).
// Validation is lenient by design: an agent is valid when it has a non-empty
// `name` and `description`. The body is the system prompt. Runtime registration
// into the agent runtime is a follow-up; the manifest gives the Library the
// identity + status it needs.
function loadAgents(): LoadedAgentEntry[] {
  if (!existsSync(AGENTS_DIR)) return [];
  const entries: LoadedAgentEntry[] = [];
  const files = readdirEntries(AGENTS_DIR).filter((f) => f.endsWith('.agent.md'));

  for (const file of files) {
    const filePath = join(AGENTS_DIR, file);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const { frontmatter } = parseSkillMd(raw);
      const fm = (frontmatter ?? {}) as { name?: unknown; description?: unknown };
      const name = typeof fm.name === 'string' ? fm.name.trim() : '';
      const desc = typeof fm.description === 'string' ? fm.description.trim() : '';
      if (!name || !desc) {
        const msg = `[project-library] agent "${file}" needs frontmatter name + description`;
        // eslint-disable-next-line no-console
        console.error(msg);
        entries.push({ agent_id: name || file.replace(/\.agent\.md$/, ''), file_path: filePath, status: 'error', error: msg });
        continue;
      }
      entries.push({ agent_id: name, file_path: filePath, status: 'ok' });
    } catch (err) {
      const msg = `[project-library] agent ${file} failed to load: ${(err as Error).message}`;
      // eslint-disable-next-line no-console
      console.error(msg);
      entries.push({ agent_id: '', file_path: filePath, status: 'error', error: msg });
    }
  }
  return entries;
}

// ── Character loading ──────────────────────────────────────────────────────────
//
// Each folder holds character.json (PersonalityCharacter: svg_id + four
// state-animation class names) + the referenced <svg_id>.svg + animations.css.
// Valid when character.json parses with the five required string fields and the
// referenced SVG exists.
function loadCharacters(): LoadedCharacterEntry[] {
  if (!existsSync(CHARACTERS_DIR)) return [];
  const entries: LoadedCharacterEntry[] = [];
  const folders = readdirEntries(CHARACTERS_DIR).filter((name) => {
    const p = join(CHARACTERS_DIR, name);
    return existsSync(p) && statSync(p).isDirectory();
  });

  const REQUIRED = ['svg_id', 'idle_animation', 'thinking_animation', 'waiting_animation', 'responding_animation'] as const;

  for (const folder of folders) {
    const folderPath = join(CHARACTERS_DIR, folder);
    const jsonPath   = join(folderPath, 'character.json');
    if (!existsSync(jsonPath)) {
      const msg = `[project-library] character "${folder}" has no character.json`;
      // eslint-disable-next-line no-console
      console.error(msg);
      entries.push({ character_id: folder, folder_path: folderPath, status: 'error', error: msg });
      continue;
    }
    try {
      const parsed = JSON.parse(readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>;
      const missing = REQUIRED.filter((k) => typeof parsed[k] !== 'string' || !(parsed[k] as string).trim());
      if (missing.length > 0) {
        const msg = `[project-library] character "${folder}": character.json missing/invalid ${missing.join(', ')}`;
        // eslint-disable-next-line no-console
        console.error(msg);
        entries.push({ character_id: folder, folder_path: folderPath, status: 'error', error: msg });
        continue;
      }
      const svgFile = join(folderPath, `${parsed.svg_id as string}.svg`);
      if (!existsSync(svgFile)) {
        const msg = `[project-library] character "${folder}": referenced svg "${parsed.svg_id}.svg" not found`;
        // eslint-disable-next-line no-console
        console.error(msg);
        entries.push({ character_id: folder, folder_path: folderPath, status: 'error', error: msg });
        continue;
      }
      entries.push({ character_id: folder, folder_path: folderPath, status: 'ok' });
    } catch (err) {
      const msg = `[project-library] character ${folder} failed to load: ${(err as Error).message}`;
      // eslint-disable-next-line no-console
      console.error(msg);
      entries.push({ character_id: folder, folder_path: folderPath, status: 'error', error: msg });
    }
  }
  return entries;
}

// ── Tool loading ────────────────────────────────────────────────────────────
//
// Each *.tool.ts file is dynamic-imported and its exports filtered down to
// those that look like ToolDefinitions. The import happens lazily — the
// loader records the file path and a deferred-load function on the manifest;
// callers iterate the manifest and resolve the function to get the live
// value.
//
// Why lazy: dynamic import in Next.js requires async, but registry consumers
// (src/tools/index.ts) want a synchronous TOOLS array at module-evaluation
// time. The skeleton's actual registration goes through an async startup
// hook (see src/tools/index.ts) — but for direct sync read access, the
// manifest exposes file paths and the consumer can decide.

function loadTools(): LoadedToolEntry[] {
  if (!existsSync(TOOLS_DIR)) return [];
  const entries: LoadedToolEntry[] = [];
  const files = readdirEntries(TOOLS_DIR).filter((f) => f.endsWith('.tool.ts') || f.endsWith('.tool.js'));

  for (const file of files) {
    const filePath = join(TOOLS_DIR, file);
    try {
      // Synchronously read + parse the file for surface-level checks before
      // we bother with dynamic import. require() doesn't work for ESM /
      // TS files in Next.js — we delegate actual code loading to the
      // consumer (src/tools/index.ts uses a build-time include).
      const _src = readFileSync(filePath, 'utf-8');
      // Loader-side validation happens after the consumer has imported
      // the value. Here we just confirm the file is reachable and record
      // the entry. The consumer calls validateToolDefinition() at register
      // time and updates the manifest entry's status.
      //
      // For Phase 1, the manifest entry is marked 'ok' on successful read.
      // Phase 2 wires the consumer's runtime validation back into this
      // entry so the DevShell can surface load errors uniformly.
      entries.push({
        tool_id:   inferToolIdFromFilename(file),
        file_path: filePath,
        status:    'ok',
      });
    } catch (err) {
      const msg = `[project-library] failed to read ${filePath}: ${(err as Error).message}`;
      // eslint-disable-next-line no-console
      console.error(msg);
      entries.push({
        tool_id:   '',
        file_path: filePath,
        status:    'error',
        error:     msg,
      });
    }
  }
  return entries;
}

function inferToolIdFromFilename(filename: string): string {
  // 'notes-create.tool.ts' → 'notes-create'. The actual ToolDefinition.id is
  // canonical at register time; this is a placeholder used by the manifest
  // before runtime registration confirms the real id.
  return filename.replace(/\.tool\.(ts|js)$/, '');
}

// Called by src/tools/index.ts after a tool module has been imported. The
// caller passes the live value; the loader validates and records it.
//
// Returns the validation result so the caller can decide whether to add the
// tool to its TOOLS array.
export function registerLoadedTool(
  filename: string,
  value:    unknown,
): { ok: boolean; errors: string[] } {
  ensureLoaded();
  if (!looksLikeToolDefinition(value)) {
    // Not a tool at all — silently skip. This is expected for files that
    // export helpers alongside their tool.
    return { ok: false, errors: ['not-a-tool'] };
  }
  const result = validateToolDefinition(value);
  const entry  = cachedManifest!.tools.find((t) => t.file_path.endsWith(filename));
  const tool   = value as { id: string };

  if (!result.ok) {
    const msg = `[project-library] tool in ${filename} failed validation: ${result.errors.join('; ')}`;
    // eslint-disable-next-line no-console
    console.error(msg);
    if (entry) { entry.status = 'error'; entry.error = msg; entry.tool_id = ''; }
    return result;
  }

  if (entry) { entry.status = 'ok'; entry.tool_id = tool.id; }
  cachedToolMap.set(tool.id, value);
  return result;
}

// ── Skill loading ───────────────────────────────────────────────────────────

function loadSkills(): LoadedSkillEntry[] {
  if (!existsSync(SKILLS_DIR)) return [];
  const entries: LoadedSkillEntry[] = [];
  const folders = readdirEntries(SKILLS_DIR).filter((name) => {
    const p = join(SKILLS_DIR, name);
    return existsSync(p) && statSync(p).isDirectory();
  });

  for (const folder of folders) {
    const folderPath = join(SKILLS_DIR, folder);
    const skillMdPath = join(folderPath, 'SKILL.md');
    if (!existsSync(skillMdPath)) {
      const msg = `[project-library] skill folder "${folder}" has no SKILL.md`;
      // eslint-disable-next-line no-console
      console.error(msg);
      entries.push({ skill_id: folder, folder_path: folderPath, status: 'error', error: msg });
      continue;
    }
    try {
      const raw  = readFileSync(skillMdPath, 'utf-8');
      const { frontmatter, body } = parseSkillMd(raw);
      const result = validateSkillFrontmatter(frontmatter);
      if (!result.ok) {
        const msg = `[project-library] skill ${folder}: ${result.errors.join('; ')}`;
        // eslint-disable-next-line no-console
        console.error(msg);
        entries.push({ skill_id: folder, folder_path: folderPath, status: 'error', error: msg });
        continue;
      }
      const fm = frontmatter as {
        id: string; name: string; priority?: number;
        trigger?: {
          views?:                string[];
          active_file_pattern?:  string;
          user_message_pattern?: string;
          inspector_required?:   boolean;
        };
      };

      if (cachedSkillMap.has(fm.id)) {
        const msg = `[project-library] skill id "${fm.id}" is duplicated (folder "${folder}")`;
        // eslint-disable-next-line no-console
        console.error(msg);
        entries.push({ skill_id: fm.id, folder_path: folderPath, status: 'error', error: msg });
        continue;
      }

      const record: LoadedSkillRecord = {
        id:       fm.id,
        name:     fm.name,
        priority: fm.priority ?? 0,
        trigger: {
          views:                fm.trigger?.views,
          active_file_pattern:  fm.trigger?.active_file_pattern  ? new RegExp(fm.trigger.active_file_pattern)  : undefined,
          user_message_pattern: fm.trigger?.user_message_pattern ? new RegExp(fm.trigger.user_message_pattern) : undefined,
          inspector_required:   fm.trigger?.inspector_required,
        },
        content:  body,
      };
      cachedSkillMap.set(fm.id, record);
      entries.push({ skill_id: fm.id, folder_path: folderPath, status: 'ok' });
    } catch (err) {
      const msg = `[project-library] skill ${folder} failed to load: ${(err as Error).message}`;
      // eslint-disable-next-line no-console
      console.error(msg);
      entries.push({ skill_id: folder, folder_path: folderPath, status: 'error', error: msg });
    }
  }
  return entries;
}

// ── Workflow loading ────────────────────────────────────────────────────────

function loadWorkflows(): LoadedWorkflowEntry[] {
  if (!existsSync(WORKFLOWS_DIR)) return [];
  const entries: LoadedWorkflowEntry[] = [];
  const files = readdirEntries(WORKFLOWS_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = join(WORKFLOWS_DIR, file);
    try {
      const raw    = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const result = validateWorkflowDefinition(parsed);
      if (!result.ok) {
        const msg = `[project-library] workflow ${file}: ${result.errors.join('; ')}`;
        // eslint-disable-next-line no-console
        console.error(msg);
        entries.push({ workflow_id: '', file_path: filePath, status: 'error', error: msg });
        continue;
      }
      const def: WorkflowDefinition = { ...(parsed as WorkflowDefinition), source: 'developer_authored' };

      if (cachedWorkflows.has(def.id)) {
        const msg = `[project-library] workflow id "${def.id}" is duplicated (file ${file})`;
        // eslint-disable-next-line no-console
        console.error(msg);
        entries.push({ workflow_id: def.id, file_path: filePath, status: 'error', error: msg });
        continue;
      }
      cachedWorkflows.set(def.id, def);
      entries.push({ workflow_id: def.id, file_path: filePath, status: 'ok', definition: def });
    } catch (err) {
      const msg = `[project-library] workflow ${file} failed to load: ${(err as Error).message}`;
      // eslint-disable-next-line no-console
      console.error(msg);
      entries.push({ workflow_id: '', file_path: filePath, status: 'error', error: msg });
    }
  }
  return entries;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function readdirEntries(dir: string): string[] {
  try { return readdirSync(dir).filter((n) => !n.startsWith('.') && n !== 'README.md'); }
  catch { return []; }
}
