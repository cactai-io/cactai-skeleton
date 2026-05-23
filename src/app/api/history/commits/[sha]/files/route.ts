// src/app/api/history/commits/[sha]/files/route.ts
// Per-commit file detail for the commit-history modal.
//
// Returns every file row that participated in the named commit, sorted by
// last_edited_at descending. Each row carries:
//   - path / new_path
//   - operation
//   - lines_added / lines_removed
//   - last_edited_at
//   - original_content / current_content (so the expandable diff in
//     the modal can render without re-fetching from GitHub)
//
// Protected: dev/collaborator only.

import { NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import type { PendingOperation } from '@/lib/pendingFiles';

interface RouteCtx { params: Promise<{ sha: string }> }

interface CommitFileRow {
  commit_sha:       string;
  path:             string;
  operation:        PendingOperation;
  new_path:         string | null;
  last_edited_at:   string;
  lines_added:      number;
  lines_removed:    number;
  original_content: string | null;
  current_content:  string | null;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await requireDevRole();
    const { sha } = await ctx.params;

    // SHA validation: GitHub commit shas are 40-char lowercase hex; we
    // accept anything that fits a permissive pattern so future hash
    // schemes still work, but reject obvious garbage.
    if (!/^[0-9a-f]{7,64}$/i.test(sha)) {
      return NextResponse.json({ error: 'invalid_sha' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('commit_log_files')
      .select('*')
      .eq('commit_sha', sha)
      .order('last_edited_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'list_failed', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ files: (data ?? []) as CommitFileRow[] });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
