// src/app/api/byok/user-keys/route.ts
//
// v1.4 — End-user provider key store. Each signed-in app user can write
// their own per-provider API key into user_api_keys (customer DB,
// per-user, encrypted at rest with SECRETS_ENCRYPTION_KEY). The
// resolveTurnPick algorithm on the platform fetches these when a
// provider's key_source resolves to 'user' (BYOK or User Choice).
//
// GET     — list this user's provider ids (no plaintext, no envelope).
// PATCH   — { set_provider: { id, value } } to upsert/delete.
//
// Auth: any signed-in user. RLS on user_api_keys enforces self-only access.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase.server';
import { encryptSecret } from '@/lib/secrets.server';

async function requireUserId(): Promise<string | null> {
  const sb = await createServerSupabaseClient();
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('provider_id, updated_at')
    .eq('user_id', userId);
  if (error) {
    return NextResponse.json({ error: 'user_keys_load_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({
    providers: (data ?? []).map(r => ({ provider_id: r.provider_id, updated_at: r.updated_at })),
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    set_provider?: { id?: string; value?: string };
  };
  const set = body.set_provider;
  if (!set || typeof set.id !== 'string' || set.id.length === 0) {
    return NextResponse.json({ error: 'invalid_provider_id' }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (set.value === '' || set.value === undefined) {
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', userId)
      .eq('provider_id', set.id);
    if (error) return NextResponse.json({ error: 'user_key_delete_failed', detail: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, removed: true });
  }

  const encrypted = await encryptSecret(set.value);
  const { error } = await supabase
    .from('user_api_keys')
    .upsert({
      user_id:           userId,
      provider_id:       set.id,
      api_key_encrypted: encrypted,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'user_id,provider_id' });
  if (error) {
    return NextResponse.json({ error: 'user_key_save_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
