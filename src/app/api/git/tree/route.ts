// src/app/api/git/tree/route.ts
//
// Reads the customer's GitHub repo tree (dev branch by default) and
// returns it in the FileNode[] shape DevShell's FileTree component
// expects. Skeleton-side, so the GITHUB_TOKEN env var stays
// server-side; never exposed to the customer's browser bundle.
//
// Recursive: GitHub returns a flat list with paths like
// 'src/app/page.tsx'; we assemble the nested FileNode tree client-side.
//
// Auth: dev/collaborator role only (same gate as other DevShell-data
// reads). The branch query param defaults to 'dev'; we never read main
// here — that's the production branch and the DevShell IDE only edits
// dev.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

interface FileNode {
  name:      string;
  path:      string;
  type:      'file' | 'folder';
  children?: FileNode[];
}

// GitHub trees API entry. Files have type='blob'; directories are
// implicit (we infer them from paths containing '/').
interface GhTreeEntry {
  path: string;
  type: 'blob' | 'tree' | 'commit';
  sha:  string;
  size?: number;
}

function buildTree(entries: GhTreeEntry[]): FileNode[] {
  // Map of full-path → FileNode. Folders get added on first child seen.
  const byPath = new Map<string, FileNode>();
  // Root-level nodes preserved in declaration order so the tree comes
  // back stable across calls.
  const roots: FileNode[] = [];

  // Sort so parent folders are processed before their children — that
  // way every node's parent already exists in the map by the time we
  // need to attach it.
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sorted) {
    // Skip submodules — type 'commit' is a git submodule pointer.
    if (entry.type === 'commit') continue;

    const segments = entry.path.split('/');
    let parent: FileNode | null = null;
    let cumulative = '';
    for (let i = 0; i < segments.length; i += 1) {
      cumulative = cumulative ? `${cumulative}/${segments[i]}` : segments[i]!;
      const isLeaf = i === segments.length - 1;
      let node = byPath.get(cumulative);
      if (!node) {
        node = {
          name: segments[i]!,
          path: cumulative,
          type: isLeaf && entry.type === 'blob' ? 'file' : 'folder',
        };
        if (node.type === 'folder') node.children = [];
        byPath.set(cumulative, node);
        if (parent) {
          parent.children = parent.children ?? [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
      parent = node;
    }
  }

  // Within each folder, list folders first then files, alphabetical.
  const sortChildren = (n: FileNode) => {
    if (!n.children) return;
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of n.children) sortChildren(c);
  };
  for (const r of roots) sortChildren(r);
  return roots;
}

export async function GET(req: NextRequest) {
  // VERCEL_ENV='production' should never reach here — the /dev surface
  // (which is the only legitimate caller) is 404 in production. Defense
  // in depth so a manually crafted request can't probe the repo.
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const session = await requireAuth();
  if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo  = process.env.GITHUB_REPO_NAME;
  if (!githubToken || !githubRepo) {
    return NextResponse.json({
      error:  'github_not_configured',
      detail: 'GITHUB_TOKEN or GITHUB_REPO_NAME env var missing. The wizard sets these at provision time; if absent the repo was provisioned outside the wizard flow.',
    }, { status: 412 });
  }

  const branch = req.nextUrl.searchParams.get('branch') ?? 'dev';

  // Two-call sequence: resolve branch → tree SHA → recursive tree.
  // Cheaper than fetching the file content here; clients fetch
  // individual files via /api/git/file?path=... when the user clicks.
  const branchRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/branches/${encodeURIComponent(branch)}`,
    {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept':        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    },
  );
  if (!branchRes.ok) {
    const detail = await branchRes.text().catch(() => '');
    return NextResponse.json({
      error:  'branch_lookup_failed',
      detail: `GitHub ${branchRes.status}: ${detail.slice(0, 200)}`,
    }, { status: 502 });
  }
  const branchInfo = await branchRes.json() as { commit?: { commit?: { tree?: { sha?: string } } } };
  const treeSha    = branchInfo.commit?.commit?.tree?.sha;
  if (!treeSha) {
    return NextResponse.json({ error: 'tree_sha_missing' }, { status: 502 });
  }

  const treeRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/git/trees/${treeSha}?recursive=1`,
    {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept':        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    },
  );
  if (!treeRes.ok) {
    const detail = await treeRes.text().catch(() => '');
    return NextResponse.json({
      error:  'tree_fetch_failed',
      detail: `GitHub ${treeRes.status}: ${detail.slice(0, 200)}`,
    }, { status: 502 });
  }
  const treeBody = await treeRes.json() as { tree?: GhTreeEntry[]; truncated?: boolean };

  return NextResponse.json({
    tree:      buildTree(treeBody.tree ?? []),
    branch,
    truncated: !!treeBody.truncated,
  });
}
