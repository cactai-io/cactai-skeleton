// src/app/api/settings/embeddings/route.ts
//
// v1.3.5 Build 6 — End-user embeddings settings.
//
// Embeddings is the "remember details from past conversations" feature. The
// provider and model are LOCKED (OpenAI / text-embedding-3-small) because
// vectors from different embedding models are not comparable — switching
// would invalidate everything the app has remembered. So this surface
// exposes ONLY:
//   - the on/off toggle (per end user, default on)
//   - the OpenAI key (BYOK; the developer-paid project key is the fallback
//     when the end user has not supplied their own)
//
// Storage:
//   - user_app_settings(user_id, key='embeddings.enabled') — toggle, customer DB
//   - user_api_keys(user_id, provider_id='openai')         — BYOK key, customer DB
//
// Auth: any signed-in end user; rows are RLS-scoped to auth.uid().

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import { encryptSecret } from '@/lib/secrets.server';
import { requireAuth } from '@/lib/auth';

interface EmbeddingsSettingsResponse {
  enabled:     boolean;
  has_key:     boolean;
  key_masked:  string | null;
  // Locked descriptors surfaced to the UI so the page renders the disabled
  // provider/model selectors even on first load (no separate catalog call).
  provider_id: 'openai';
  model_id:    'text-embedding-3-small';
}

export async function GET(): Promise<NextResponse<EmbeddingsSettingsResponse | { error: string }>> {
  try {
    const session  = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const [{ data: settingRow }, { data: keyRow }] = await Promise.all([
      supabase
        .from('user_app_settings')
        .select('value')
        .eq('user_id', session.id)
        .eq('key', 'embeddings.enabled')
        .maybeSingle(),
      supabase
        .from('user_api_keys')
        .select('updated_at')
        .eq('user_id', session.id)
        .eq('provider_id', 'openai')
        .maybeSingle(),
    ]);

    const enabled = settingRow?.value === false ? false
                  : settingRow?.value === 'false' ? false
                  : true;
    const has_key = !!keyRow;

    return NextResponse.json({
      enabled,
      has_key,
      key_masked:  has_key ? '••••••••' : null,
      provider_id: 'openai',
      model_id:    'text-embedding-3-small',
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'load_failed' },
      { status: 500 },
    );
  }
}

interface EmbeddingsSettingsPatch {
  /** Toggle the feature on or off. */
  enabled?: boolean;
  /** New OpenAI key. Empty string clears the key (removes the row). */
  openai_api_key?: string;
}

export async function PATCH(req: NextRequest) {
  try {
    const session  = await requireAuth();
    const supabase = await createServerSupabaseClient();
    const patch    = (await req.json()) as EmbeddingsSettingsPatch;

    if (typeof patch.enabled === 'boolean') {
      // Default = true; we only persist when the user has explicitly toggled
      // it off, then later flip the row back to true on re-enable so the
      // setting is recoverable. We could delete on true to save space; both
      // shapes are acceptable per the schema's "missing row == enabled"
      // convention.
      const { error } = await supabase
        .from('user_app_settings')
        .upsert({
          user_id: session.id,
          key:     'embeddings.enabled',
          value:   patch.enabled,
        }, { onConflict: 'user_id,key' });
      if (error) throw error;
    }

    if (typeof patch.openai_api_key === 'string') {
      if (patch.openai_api_key === '') {
        const { error } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', session.id)
          .eq('provider_id', 'openai');
        if (error) throw error;
      } else {
        // Envelope-encrypt with the shared SECRETS_ENCRYPTION_KEY (v2
        // format: AES-256-GCM with a fresh per-secret DEK wrapped by the
        // master key). The platform's embedding-resolver round-trips via
        // decryptSecret on read, so this is the canonical encrypted shape.
        // Without the env var set, the call throws and the route returns
        // 500 — fail closed rather than writing plaintext.
        const ciphertext = await encryptSecret(patch.openai_api_key);
        const { error } = await supabase
          .from('user_api_keys')
          .upsert({
            user_id:           session.id,
            provider_id:       'openai',
            api_key_encrypted: Buffer.from(ciphertext, 'utf8'),
            updated_at:        new Date().toISOString(),
          }, { onConflict: 'user_id,provider_id' });
        if (error) throw error;
      }
    }

    // Re-read state so the UI updates without a second round-trip.
    return GET();
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'update_failed' },
      { status: 500 },
    );
  }
}
