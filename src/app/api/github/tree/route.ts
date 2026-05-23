// src/app/api/github/tree/route.ts
// Fetches the project's file tree from GitHub using the stored token.
// Returns a tree of FileNode objects for the DevShell project tree panel.
// Protected: dev/collaborator only.

import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

const GITHUB_API = 'https://api.github.com';

export async function GET() {
  try {
    await requireDevRole();

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

    // Get the default branch's tree (recursive)
    const branchRes = await fetch(`${GITHUB_API}/repos/${repoName}/branches/dev`, { headers });
    if (!branchRes.ok) return NextResponse.json({ nodes: [] });
    const branchData = await branchRes.json() as { commit: { commit: { tree: { sha: string } } } };
    const treeSha    = branchData.commit.commit.tree.sha;

    const treeRes = await fetch(`${GITHUB_API}/repos/${repoName}/git/trees/${treeSha}?recursive=1`, { headers });
    if (!treeRes.ok) return NextResponse.json({ nodes: [] });
    const treeData = await treeRes.json() as { tree: Array<{ path: string; type: string; sha: string }> };

    // Build nested FileNode structure
    const nodes = buildFileTree(treeData.tree);
    return NextResponse.json({ nodes });
  } catch {
    return NextResponse.json({ nodes: [] });
  }
}

interface RawEntry { path: string; type: string }

interface FileNode {
  name:      string;
  path:      string;
  type:      'file' | 'folder';
  modified:  boolean;
  protected: boolean;
  children?: FileNode[];
}

function buildFileTree(entries: RawEntry[]): FileNode[] {
  const root: FileNode[] = [];
  const map: Record<string, FileNode> = {};

  // Filter out hidden and build directories
  const filtered = entries
    .filter(e => !e.path.startsWith('.') && !e.path.includes('node_modules') && !e.path.includes('.next'))
    .sort((a, b) => {
      // Folders before files
      if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

  for (const entry of filtered) {
    const parts = entry.path.split('/');
    const name  = parts[parts.length - 1]!;
    const node: FileNode = {
      name,
      path:      entry.path,
      type:      entry.type === 'tree' ? 'folder' : 'file',
      modified:  false,
      protected: entry.path === 'node_modules' || entry.path.startsWith('packages/'),
      children:  entry.type === 'tree' ? [] : undefined,
    };
    map[entry.path] = node;

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent     = map[parentPath];
      if (parent?.children) parent.children.push(node);
    }
  }

  return root;
}
