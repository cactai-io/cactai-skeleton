// src/app/api/github/revert/[sha]/route.ts
//
// Thread 12 — revert a past commit by creating a new commit on dev
// that reverses the original's changes.
//
// Mechanics:
//   1. Look up the original commit in commit_log + commit_log_files
//      (the DevShell only reverts DevShell-originated commits — git
//      CLI commits are not in this table and can't be reverted here).
//   2. Compute the inverse changeset from the persisted snapshots:
//        edit   → write original_content back
//        create → delete the path
//        delete → re-create with original_content
//        rename → swap path / new_path
//        move   → same as rename
//   3. Drive the inverse changeset through the existing
//      /api/github/commit logic — same atomic git tree + commit path,
//      same conflict pre-flight (if dev moved since the commit, the
//      revert conflicts and routes the developer through the
//      CommitConflictModal exactly like a normal commit).
//   4. Insert into commit_log with reverts_sha = <original_sha>. The
//      commit message defaults to `Revert "<original message>"`.
//
// Branch: always dev. The v1.2 architecture removed commit-to-main; a
// revert that the developer wants on main is done by reverting on dev
// and merging dev → main via GitHub manually.
//
// The actual GitHub call funnels through the same handler used by the
// normal commit route — we just hand-build the request shape from the
// snapshots and call into the multi-file path. To keep the
// implementation simple and avoid two divergent code paths, this route
// constructs the body and forwards it to /api/github/commit via an
// internal fetch against the same server origin. The receiving route
// applies the conflict pre-flight, builds the git tree, and writes
// commit_log + commit_log_files just like any other commit.
//
// Protected: dev/collaborator only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import type { PendingOperation } from '@/lib/pendingFiles';

interface RouteCtx { params: Promise<{ sha: string }> }

interface CommitLogRow {
  commit_sha: string;
  message:    string;
}

interface CommitLogFileRow {
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

interface InverseFile {
  path:           string;
  operation:      PendingOperation;
  new_path?:      string | null;
  content?:       string | null;
  last_edited_at: string;
  lines_added:    number;
  lines_removed:  number;
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    await requireDevRole();
    const { sha } = await ctx.params;

    if (!/^[0-9a-f]{7,64}$/i.test(sha)) {
      return NextResponse.json({ error: 'invalid_sha' }, { status: 400 });
    }

    // Optional body — accepts an override commit message. The client
    // shows the default and lets the developer edit before confirming.
    const body = await req.json().catch(() => ({})) as { message?: string };

    const supabase = await createServerSupabaseClient();

    // 1. Header — gives us the original message for the default revert
    //    title and confirms the SHA is one we created via the DevShell.
    const headerRes = await supabase
      .from('commit_log')
      .select('commit_sha, message')
      .eq('commit_sha', sha)
      .maybeSingle();
    if (headerRes.error) {
      return NextResponse.json({ error: 'lookup_failed', detail: headerRes.error.message }, { status: 500 });
    }
    const header = headerRes.data as CommitLogRow | null;
    if (!header) {
      return NextResponse.json({
        error:  'commit_not_found',
        detail: 'No DevShell record for this commit. Commits made via git CLI or the GitHub web UI cannot be reverted from the DevShell.',
      }, { status: 404 });
    }

    // 2. Files — every file row in the original commit, with the
    //    content snapshots needed to invert each operation.
    const filesRes = await supabase
      .from('commit_log_files')
      .select('*')
      .eq('commit_sha', sha);
    if (filesRes.error) {
      return NextResponse.json({ error: 'lookup_failed', detail: filesRes.error.message }, { status: 500 });
    }
    const files = (filesRes.data ?? []) as CommitLogFileRow[];
    if (files.length === 0) {
      return NextResponse.json({
        error:  'no_files',
        detail: 'This commit has no file rows recorded; nothing to revert.',
      }, { status: 422 });
    }

    // 3. Build the inverse changeset.
    const now = new Date().toISOString();
    const inverse: InverseFile[] = [];
    for (const f of files) {
      switch (f.operation) {
        case 'edit': {
          inverse.push({
            path:           f.path,
            operation:      'edit',
            content:        f.original_content ?? '',
            last_edited_at: now,
            lines_added:    f.lines_removed,
            lines_removed:  f.lines_added,
          });
          break;
        }
        case 'create': {
          inverse.push({
            path:           f.path,
            operation:      'delete',
            content:        null,
            last_edited_at: now,
            lines_added:    0,
            lines_removed:  f.lines_added,
          });
          break;
        }
        case 'delete': {
          inverse.push({
            path:           f.path,
            operation:      'create',
            content:        f.original_content ?? '',
            last_edited_at: now,
            lines_added:    f.lines_removed,
            lines_removed:  0,
          });
          break;
        }
        case 'rename':
        case 'move': {
          if (!f.new_path) continue;
          inverse.push({
            path:           f.new_path,
            operation:      f.operation,
            new_path:       f.path,
            content:        f.current_content ?? '',
            last_edited_at: now,
            lines_added:    f.lines_removed,
            lines_removed:  f.lines_added,
          });
          break;
        }
      }
    }

    if (inverse.length === 0) {
      return NextResponse.json({
        error:  'empty_inverse',
        detail: 'The original commit had no invertible operations.',
      }, { status: 422 });
    }

    // 4. Forward to /api/github/commit via an internal fetch. This
    //    keeps the GitHub API logic, the conflict pre-flight, and the
    //    commit_log writes in a single canonical place. We pass the
    //    incoming request's cookie header so the receiving route's
    //    requireDevRole call sees the same session.
    const message = (typeof body.message === 'string' && body.message.trim().length > 0)
      ? body.message
      : `Revert "${header.message}"`;
    const cookie = req.headers.get('cookie') ?? '';
    const origin = req.nextUrl.origin;

    const forwardRes = await fetch(`${origin}/api/github/commit`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie,
      },
      body: JSON.stringify({
        files:       inverse,
        message,
        reverts_sha: header.commit_sha,
      }),
    });

    // Stream the response through. Conflict (409) and any other
    // failure mode propagate to the client untouched so the
    // CommitConflictModal flow works on reverts identically to normal
    // commits.
    const data = await forwardRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: forwardRes.status });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
