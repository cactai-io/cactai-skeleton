// src/app/api/lens/route.ts
// Switch the user-level default lens (mutates Supabase JWT app_metadata.lens).
//
// Authorization: the requested lens must (a) exist in tenant_roles_catalog,
// and (b) correspond to a tenant_members row this user actually holds.
//
// Per-tab lens switching does NOT call this endpoint — that's the
// X-Cactai-Lens header pattern handled by openLensTab() in lens-tab.ts.
// This endpoint changes the user's persistent default across tabs without
// per-tab overrides.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';
import { isValidLens, getRoleCatalog } from '@/lib/lens';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => ({})) as { lens?: string };
    const lens = body.lens;

    if (!lens || !(await isValidLens(lens))) {
      return NextResponse.json({ error: 'invalid_lens' }, { status: 400 });
    }

    // The caller must actually hold the role they're switching into.
    const holds = session.all_roles.some(r => r.role === lens);
    if (!holds) {
      return NextResponse.json({ error: 'forbidden_lens' }, { status: 403 });
    }

    const admin = createServiceSupabaseClient();
    const { data: existing, error: getErr } = await admin.auth.admin.getUserById(session.id);
    if (getErr || !existing.user) {
      return NextResponse.json({ error: 'user_lookup_failed' }, { status: 502 });
    }
    const mergedAppMetadata = {
      ...(existing.user.app_metadata as Record<string, unknown>),
      lens,
    };

    const { error: updateErr } = await admin.auth.admin.updateUserById(session.id, {
      app_metadata: mergedAppMetadata,
    });
    if (updateErr) {
      return NextResponse.json({ error: 'lens_update_failed', detail: updateErr.message }, { status: 502 });
    }

    const { audit } = await import('@/lib/audit.server');
    await audit({
      user_id:     session.id,
      tenant_id:   session.tenant_id,
      lens:        (session.active_lens ?? null) as never,
      action:      'lens.switched',
      target_type: 'lens',
      target_id:   lens,
      metadata:    { from: session.active_lens ?? null, to: lens },
    });

    return NextResponse.json({ lens, requires_refresh: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}

// GET returns the caller's current lens and the lenses they're allowed to
// switch into. The avatar-menu uses this to render the lens-switcher items.
// Available lenses are the intersection of (catalog roles, user's held roles).
export async function GET() {
  try {
    const session = await requireAuth();
    const catalog = await getRoleCatalog();
    const catalogRoles = new Set(catalog.map(r => r.role));
    const availableLenses = Array.from(new Set(
      session.all_roles.map(r => r.role).filter(r => catalogRoles.has(r))
    ));
    // Decorate with catalog metadata so the menu can render labels.
    const decorated = availableLenses.map(role => {
      const meta = catalog.find(c => c.role === role);
      return { role, label: meta?.label ?? role, rank: meta?.rank ?? 0 };
    }).sort((a, b) => b.rank - a.rank);

    return NextResponse.json({
      active_lens:      session.active_lens,
      available_lenses: decorated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 });
  }
}
