// packages/devshell/src/authoringSave.ts
//
// Composes the on-disk file(s) for a Studio-authored artifact from the
// authoring form's field values, targeting project-library/<type>/. The host
// (SelfDrivenDevShell) commits the result through the skeleton's existing
// commit-to-dev endpoint (/api/github/commit, operation 'create').
//
// Tools are written as a SCAFFOLD — a valid ToolDefinition with the schema
// stubbed and execute() throwing — because a form can't supply the
// implementation. Skills / agents (Markdown) and characters (json + svg + css)
// are composed completely from the form. Personalities are NOT here — they
// have their own store (Configuration → Design).
const slug = (s) => (s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const v = (values, k) => (values[k] ?? '').trim();
/** Returns the file(s) to write for a project-library artifact type, or null
 *  for types that don't live in project-library (personality). */
export function composeArtifactFiles(type, values) {
    switch (type) {
        case 'tool': {
            const id = slug(v(values, 'name'));
            const domain = slug(v(values, 'domain')) || 'custom';
            const name = v(values, 'name') || id;
            const desc = v(values, 'description');
            const inputs = v(values, 'inputs');
            const content = `// project-library/tools/${id}.tool.ts
// Authored in Studio. SCAFFOLD — fill in input_schema + the execute() body.
${inputs ? `//\n// Inputs (from authoring):\n${inputs.split('\n').map(l => `//   ${l}`).join('\n')}\n` : ''}
import type { ToolDefinition, ToolContext } from '@cactai-io/core';

export const ${camel(id)}: ToolDefinition = {
  id:          '${domain}:${id}',
  name:        ${JSON.stringify(name)},
  domain:      ${JSON.stringify(domain)},
  description: ${JSON.stringify(desc)},
  input_schema:  { type: 'object', properties: {}, required: [] },
  output_schema: { type: 'object', properties: {} },
  is_reversible: false, is_idempotent: false,
  side_effect_scope: 'internal', execution_weight: 'light', is_async: true,
  provider_requirement: { category: 'none', selectable: false, required_capability: 'none' },
  async execute(_input: unknown, _ctx: ToolContext) {
    throw new Error(${JSON.stringify(`${name}: not implemented yet — author the execute() body.`)});
  },
};
`;
            return { id, message: `Studio: add tool ${id}`, files: [{ path: `project-library/tools/${id}.tool.ts`, content }] };
        }
        case 'skill': {
            const id = slug(v(values, 'name'));
            const name = v(values, 'name') || id;
            const desc = v(values, 'description');
            const inputs = v(values, 'inputs');
            const content = `---
id:       ${id}
name:     ${name}
priority: 50
---

# ${name}

${desc}
${inputs ? `\n## Inputs\n\n${inputs}\n` : ''}`;
            return { id, message: `Studio: add skill ${id}`, files: [{ path: `project-library/skills/${id}/SKILL.md`, content }] };
        }
        case 'agent': {
            const id = slug(v(values, 'name'));
            const name = v(values, 'name') || id;
            const use = v(values, 'use');
            const loc = v(values, 'location');
            const content = `---
name:        ${id}
description: ${use || `The ${name} agent.`}
---

${use || `You are the ${name} agent.`}
${loc ? `\nInvoked from: ${loc}\n` : ''}`;
            return { id, message: `Studio: add agent ${id}`, files: [{ path: `project-library/agents/${id}.agent.md`, content }] };
        }
        case 'character': {
            const id = slug(v(values, 'name'));
            const desc = v(values, 'description');
            const characterJson = JSON.stringify({
                svg_id: id,
                idle_animation: `anim-${id}-idle`,
                thinking_animation: `anim-${id}-think`,
                waiting_animation: `anim-${id}-wait`,
                responding_animation: `anim-${id}-respond`,
            }, null, 2) + '\n';
            // Placeholder SVG so the loader validates; replace with the real artwork
            // (drawn by AI or an external tool) at <id>.svg.
            const svg = `<svg class="${id}-root" width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- Placeholder — replace with the real ${id} artwork. Give moving parts
       named classes (e.g. .${id}-head) so animations.css can target them. -->
  <circle class="${id}-body" cx="32" cy="34" r="20" fill="var(--surface, #2A2A3D)" stroke="var(--border, #444)"/>
  <circle class="${id}-head" cx="32" cy="22" r="10" fill="var(--surface, #2A2A3D)" stroke="var(--border, #444)"/>
</svg>
`;
            const css = `/* Character animations for "${id}". Each keyframe is a location/transform
   change on the SVG's named parts (the "location-change instructions"). */
.anim-${id}-idle    { animation: ${id}-idle 4s ease-in-out infinite; }
.anim-${id}-think   { animation: ${id}-think 1.2s ease-in-out infinite; }
.anim-${id}-wait    { animation: ${id}-wait 2s ease-in-out infinite; }
.anim-${id}-respond { animation: ${id}-respond 0.8s ease-in-out infinite; }

@keyframes ${id}-idle    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes ${id}-think   { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-4deg); } }
@keyframes ${id}-wait    { 0%,100% { transform: translateX(0); } 50% { transform: translateX(1px); } }
@keyframes ${id}-respond { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
`;
            return {
                id,
                message: `Studio: add character ${id}`,
                files: [
                    { path: `project-library/characters/${id}/character.json`, content: characterJson },
                    { path: `project-library/characters/${id}/${id}.svg`, content: svg },
                    { path: `project-library/characters/${id}/animations.css`, content: css },
                ],
            };
        }
        case 'personality':
            return null; // personalities live in their own store, not project-library
    }
}
