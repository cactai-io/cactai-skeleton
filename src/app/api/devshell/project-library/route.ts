// src/app/api/devshell/project-library/route.ts
//
// Exposes this app's project-library manifest (developer-authored tools,
// skills, workflows, agents, characters) so the DevShell Library can index
// them with file paths + validation status. The manifest is built server-side
// by the loader; this route just serializes it. File paths are made relative
// to the repo root so the Library shows them cleanly.
//
// Protected: dev/collaborator only.

import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { loadProjectLibrary } from '@/lib/projectLibrary.server';

function rel(p: string): string {
  const i = p.indexOf('project-library/');
  return i >= 0 ? p.slice(i) : p;
}

export async function GET() {
  try {
    await requireDevRole();
    const m = loadProjectLibrary();
    return NextResponse.json({
      tools:      m.tools.map(t => ({ id: t.tool_id, path: rel(t.file_path), status: t.status, error: t.error })),
      skills:     m.skills.map(s => ({ id: s.skill_id, path: rel(s.folder_path), status: s.status, error: s.error })),
      workflows:  m.workflows.map(w => ({ id: w.workflow_id, path: rel(w.file_path), status: w.status, error: w.error })),
      agents:     m.agents.map(a => ({ id: a.agent_id, path: rel(a.file_path), status: a.status, error: a.error })),
      characters: m.characters.map(c => ({ id: c.character_id, path: rel(c.folder_path), status: c.status, error: c.error })),
      loaded_at:  m.loaded_at,
    });
  } catch (err) {
    return NextResponse.json({ error: 'project_library_read_failed', detail: (err as Error).message }, { status: 500 });
  }
}
