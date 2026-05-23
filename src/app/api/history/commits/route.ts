// src/app/api/history/commits/route.ts
// Paginated DevShell-originated commit history with optional time-range
// filtering.
//
// Source: commit_log table on the developer's Supabase. Only commits
// made through the DevShell are recorded here (the /api/github/commit
// route writes the row after its GitHub commit succeeds). Commits made
// via git CLI or the GitHub web UI do not appear in this list.
//
// Query params:
//   from   — ISO timestamp, inclusive lower bound on committed_at.
//   to     — ISO timestamp, exclusive upper bound on committed_at.
//   before — ISO timestamp, exclusive upper bound used as the
//            pagination cursor. Clients pass the previous response's
//            next_cursor here to load older. Independent of `to`: the
//            effective upper bound for a paged request is min(to, before).
//   reverts_sha_eq — optional exact-match filter on the reverts_sha
//            column, used by /api/history/commits/[sha]/reverts to look
//            up the revert that targets a given original commit. The
//            client doesn't pass this through the modal; it lives here
//            so the modal's row-level "this was reverted" badge can do
//            a one-shot lookup without a separate route.
//
// Pagination: 20 per page; clients pass `?before=<ISO>` to load older
// with the same filter set. Returns commits sorted by committed_at
// descending. The accompanying /api/history/commits/[sha]/files route
// returns the per-file detail for a given commit.
//
// Thread 12 adds reverts_sha and revert_of_committer_id columns on
// commit_log; this route surfaces reverts_sha so the modal can render a
// "Revert of <sha>" pill on revert commits without an extra round-trip.
//
// Protected: dev/collaborator only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';

const PAGE_SIZE = 20;

interface CommitLogRow {
  commit_sha:   string;
  committer_id: string;
  committed_at: string;
  message:      string;
  reverts_sha:  string | null;
}

// Per-param ISO validator. We rely on Postgres for the actual cast; the
// pre-flight check just rejects obvious garbage so we don't ship a
// 500-with-stack-trace to the client for a fat-fingered query string.
function parseIso(name: string, raw: string | null): { ok: true; value: string | null }
                                                  | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  if (!Number.isFinite(Date.parse(raw))) {
    return { ok: false, error: `invalid_${name}` };
  }
  return { ok: true, value: raw };
}

export async function GET(req: NextRequest) {
  try {
    await requireDevRole();

    const beforeR = parseIso('before', req.nextUrl.searchParams.get('before'));
    if (!beforeR.ok) return NextResponse.json({ error: beforeR.error }, { status: 400 });
    const fromR = parseIso('from', req.nextUrl.searchParams.get('from'));
    if (!fromR.ok) return NextResponse.json({ error: fromR.error }, { status: 400 });
    const toR = parseIso('to', req.nextUrl.searchParams.get('to'));
    if (!toR.ok) return NextResponse.json({ error: toR.error }, { status: 400 });
    const revertsShaEq = req.nextUrl.searchParams.get('reverts_sha_eq');

    // Effective upper bound for this page = min(to, before). Both are
    // exclusive; whichever comes first in time wins. `to` is the user's
    // filter; `before` is pagination chasing older commits.
    let upper: string | null = null;
    if (beforeR.value && toR.value) {
      upper = Date.parse(beforeR.value) < Date.parse(toR.value) ? beforeR.value : toR.value;
    } else {
      upper = beforeR.value ?? toR.value;
    }

    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('commit_log')
      .select('commit_sha, committer_id, committed_at, message, reverts_sha')
      .order('committed_at', { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (upper)         query = query.lt('committed_at', upper);
    if (fromR.value)   query = query.gte('committed_at', fromR.value);
    if (revertsShaEq && /^[0-9a-f]{7,64}$/i.test(revertsShaEq)) {
      query = query.eq('reverts_sha', revertsShaEq);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'list_failed', detail: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as CommitLogRow[];
    // Look one past the page to set has_more without a count() round-trip.
    const has_more = rows.length > PAGE_SIZE;
    const commits  = has_more ? rows.slice(0, PAGE_SIZE) : rows;

    return NextResponse.json({
      commits,
      has_more,
      // The client uses this as `?before=` on the next page request.
      // Filters (`from`, `to`) must be re-sent alongside it to keep the
      // result set consistent across pages.
      next_cursor: has_more ? commits[commits.length - 1]?.committed_at ?? null : null,
    });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
