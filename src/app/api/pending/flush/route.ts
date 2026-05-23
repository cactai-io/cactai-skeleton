// src/app/api/pending/flush/route.ts
// Beacon-friendly bulk upsert for pending rows. Called by
// navigator.sendBeacon() at visibilitychange:hidden and beforeunload so
// edits in flight at tab close still reach Supabase.
//
// Accepts the same `{ files: PendingFile[] }` body shape as
// POST /api/pending/files. Why a separate route at all?
//
//   - sendBeacon's contract: fire-and-forget, low priority, no custom
//     headers, queues for delivery past pagehide. The server-side semantics
//     should mirror that: no response negotiation, no detailed error
//     surface, just an upsert with a 204 reply. Distinguishing the routes
//     keeps that contract explicit and lets observability split beacon
//     traffic from interactive traffic without grepping bodies.
//   - It also lets us be more permissive on validation (the beacon is
//     best-effort — we'd rather take some and skip malformed rows than
//     drop the whole payload on one bad entry).
//
// Protected: dev/collaborator only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import { validatePendingFileInput, type PendingFileRow } from '@/lib/pendingFiles';

interface BeaconBody {
  files: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireDevRole();
    const body = (await req.json().catch(() => ({}))) as BeaconBody;

    if (!Array.isArray(body.files) || body.files.length === 0) {
      // 204 even on no-op so the beacon's delivery succeeds without the
      // browser retrying on a 4xx response in some implementations.
      return new NextResponse(null, { status: 204 });
    }
    if (body.files.length > 500) {
      // Hard cap on beacon size to keep us within the 64 KB sendBeacon
      // budget plus row size sanity. The manager doesn't generate this
      // many rows in normal operation; this guards against runaway tabs.
      return new NextResponse(null, { status: 413 });
    }

    const rows: PendingFileRow[] = [];
    for (const f of body.files) {
      const result = validatePendingFileInput(f, user.id);
      // Beacon path: skip malformed rows silently. The next interactive
      // flush re-sends a clean version anyway.
      if (result.ok) rows.push(result.row);
    }
    if (rows.length === 0) return new NextResponse(null, { status: 204 });

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('pending_files')
      .upsert(rows, { onConflict: 'user_id,path' });
    if (error) {
      // Best-effort: the client can't react to this response in practice
      // (the page is hidden / closing). Return 204 anyway and rely on
      // the next interactive flush to recover state.
      // eslint-disable-next-line no-console
      console.warn('[pending/flush] upsert failed', error.message);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
