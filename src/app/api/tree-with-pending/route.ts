// src/app/api/tree-with-pending/route.ts
// Merged file tree for the DevShell's file panel.
//
// Returns the dev-branch tree (as /api/github/tree would) decorated with
// per-node `status` derived from the caller's pending_files rows. The
// statuses are:
//
//   clean    — no pending row touches this path.
//   modified — operation === 'edit'
//   new      — operation === 'create' (the file isn't on dev yet)
//   deleted  — operation === 'delete'
//   renamed  — operation === 'rename' (file appears at both old path and
//              new_path; the old path is `renamed`, the new path is `new`-
//              looking but tagged `renamed_to`)
//   moved    — operation === 'move' (same shape as renamed)
//
// Why the route merges server-side instead of letting the client do it:
//
//   - The pending_files table is RLS-scoped to the authenticated user.
//     The dev tree is shared across collaborators. Merging on the server
//     means the response carries only this user's overlay — no leak of
//     other developers' pending edits.
//   - The client renders. The merge logic stays in one place, not in
//     every consumer of the tree.
//
// Protected: dev/collaborator only.

import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import type { PendingFileRow } from '@/lib/pendingFiles';

const GITHUB_API = 'https://api.github.com';

// File-tree node shape returned to the client. Extends the existing
// FileNode in /api/github/tree with v1.2 pending-overlay fields.
export interface MergedFileNode {
  name:      string;
  path:      string;
  type:      'file' | 'folder';
  protected: boolean;
  status:    'clean' | 'modified' | 'new' | 'deleted' | 'renamed' | 'moved';
  // For renamed/moved rows that represent the *old* path slot, points at
  // the new path so the tree can render the "→ new/path" arrow.
  new_path?: string;
  children?: MergedFileNode[];
}

interface GitHubTreeEntry {
  path: string;
  type: 'tree' | 'blob' | 'commit';
}

export async function GET() {
  try {
    const user = await requireDevRole();

    const token    = process.env.GITHUB_TOKEN;
    const repoName = process.env.GITHUB_REPO_NAME;
    if (!token || !repoName) {
      return NextResponse.json({ nodes: [] });
    }

    const headers = {
      Authorization:          `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      Accept:                 'application/vnd.github+json',
    };

    // 1. Fetch the dev-branch tree from GitHub.
    const branchRes = await fetch(`${GITHUB_API}/repos/${repoName}/branches/dev`, { headers });
    if (!branchRes.ok) return NextResponse.json({ nodes: [] });
    const branchData = await branchRes.json() as { commit: { commit: { tree: { sha: string } } } };
    const treeSha    = branchData.commit.commit.tree.sha;

    const treeRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/trees/${treeSha}?recursive=1`, { headers });
    if (!treeRes.ok) return NextResponse.json({ nodes: [] });
    const treeData = await treeRes.json() as { tree: GitHubTreeEntry[] };

    // 2. Fetch the caller's pending rows. RLS scopes to auth.uid().
    const supabase = await createServerSupabaseClient();
    const { data: pendingRaw } = await supabase
      .from('pending_files')
      .select('path, operation, new_path')
      .eq('user_id', user.id);
    const pending = (pendingRaw ?? []) as Pick<PendingFileRow, 'path' | 'operation' | 'new_path'>[];

    // 3. Build a path→pending lookup and a set of paths to add for
    // 'create' rows (files not yet on dev).
    const pendingByPath = new Map<string, Pick<PendingFileRow, 'operation' | 'new_path'>>();
    for (const p of pending) {
      pendingByPath.set(p.path, { operation: p.operation, new_path: p.new_path });
    }

    // 4. Walk the dev tree, drop hidden / node_modules / .next, tag each
    // node, and add the rename/move new-path entry where applicable.
    const filtered = treeData.tree.filter(e =>
      !e.path.startsWith('.')
      && !e.path.includes('node_modules')
      && !e.path.includes('.next'),
    );

    // Collect synthetic entries the merge needs to introduce. Two kinds:
    //   - 'create' rows whose path isn't in the GitHub tree.
    //   - 'rename'/'move' rows: the new_path slot, which may not be
    //     present in the GitHub tree yet.
    interface SyntheticEntry { path: string; type: 'file'; status: MergedFileNode['status']; new_path?: string }
    const synthetic: SyntheticEntry[] = [];

    const existingPaths = new Set(filtered.map(e => e.path));
    for (const [p, info] of pendingByPath.entries()) {
      if (info.operation === 'create' && !existingPaths.has(p)) {
        synthetic.push({ path: p, type: 'file', status: 'new' });
      } else if ((info.operation === 'rename' || info.operation === 'move') && info.new_path) {
        if (!existingPaths.has(info.new_path)) {
          synthetic.push({
            path:   info.new_path,
            type:   'file',
            status: info.operation === 'rename' ? 'renamed' : 'moved',
          });
        }
      }
    }

    // 5. Build the nested tree. Folder-before-file sort, alphabetical
    // within the same type. The 'protected' flag mirrors the existing
    // /api/github/tree route's heuristic.
    const raws: RawNode[] = filtered.map(e => {
      const info = pendingByPath.get(e.path);
      let status: MergedFileNode['status'] = 'clean';
      let new_path: string | undefined;
      if (info) {
        switch (info.operation) {
          case 'edit':   status = 'modified'; break;
          case 'delete': status = 'deleted';  break;
          case 'rename': status = 'renamed';  if (info.new_path) new_path = info.new_path; break;
          case 'move':   status = 'moved';    if (info.new_path) new_path = info.new_path; break;
          case 'create': status = 'new';      break;
        }
      }
      return {
        path:    e.path,
        type:    e.type === 'tree' ? 'folder' : 'file',
        status,
        ...(new_path ? { new_path } : {}),
      };
    });
    for (const s of synthetic) {
      raws.push({ path: s.path, type: s.type, status: s.status, ...(s.new_path ? { new_path: s.new_path } : {}) });
    }

    // buildNestedTree handles its own sort (after introducing synthesized
    // ancestor folders for synthetic entries whose parent is missing).
    const nodes = buildNestedTree(raws);
    return NextResponse.json({ nodes });
  } catch {
    return NextResponse.json({ nodes: [] });
  }
}

interface RawNode {
  path:     string;
  type:     'file' | 'folder';
  status:   MergedFileNode['status'];
  new_path?: string;
}

function buildNestedTree(entries: RawNode[]): MergedFileNode[] {
  const root: MergedFileNode[] = [];
  const map: Record<string, MergedFileNode> = {};

  // Ensure parent folders exist for synthetic entries by introducing
  // ancestor folders that aren't already in the tree (e.g. a 'create' at
  // 'project-library/tools/foo.ts' when 'project-library/tools/' isn't
  // in the GitHub tree because the directory is empty on dev).
  const seen = new Set(entries.map(e => e.path));
  const ancestors: RawNode[] = [];
  for (const e of entries) {
    const parts = e.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const anc = parts.slice(0, i).join('/');
      if (!seen.has(anc)) {
        ancestors.push({ path: anc, type: 'folder', status: 'clean' });
        seen.add(anc);
      }
    }
  }
  const all = [...entries, ...ancestors].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const entry of all) {
    const parts = entry.path.split('/');
    const name  = parts[parts.length - 1] ?? entry.path;
    const node: MergedFileNode = {
      name,
      path:      entry.path,
      type:      entry.type,
      protected: entry.path.startsWith('packages/'),
      status:    entry.status,
      ...(entry.new_path ? { new_path: entry.new_path } : {}),
      ...(entry.type === 'folder' ? { children: [] } : {}),
    };
    map[entry.path] = node;
    if (parts.length === 1) {
      root.push(node);
    } else {
      const parent = map[parts.slice(0, -1).join('/')];
      if (parent?.children) parent.children.push(node);
    }
  }

  return root;
}
