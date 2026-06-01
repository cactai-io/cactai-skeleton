// src/app/api/settings/byok/route.ts
// v1.2 Thread 08 — BYOK toggle and per-provider key write surface.
// v1.3.5 2026-05-29 — values are now v2-envelope encrypted via
//   encryptSecret() before storing. The PATCH handler accepts a
//   plaintext `value` from the client (over TLS) and encrypts before
//   writing to project_state.decisions.byok. Reads return the envelope
//   directly in the masked display form; runtime consumers that need
//   the plaintext use getBYOKPlaintext() in projectDecisions.server.ts.
//
// "Bring your own key" is the per-project switch between developer-supplied
// provider API keys and Cactai-supplied ones. The toggle moved out of the
// workflow's brand_lock step into Project Settings for post-workflow
// access; this route is what the Project Settings panel reads and writes.
//
// Sensitive note: provider key values are stored on the developer's own
// Supabase (which is the developer's own infrastructure, not Cactai's),
// envelope-encrypted with the shared SECRETS_ENCRYPTION_KEY that the
// platform forwarded into the customer's Vercel env at provision time.
// The masked display form is returned on every GET; the raw value is
// accepted on PATCH and never echoed back.
//
// Protected: dev only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';
import {
  loadBYOK,
  saveBYOK,
  maskBYOKValue,
} from '@/lib/projectDecisions.server';
import { encryptSecret } from '@/lib/secrets.server';
import type {
  ProjectBYOKResponse,
  ProjectBYOKPatch,
} from '@cactai-io/types';

export async function GET() {
  try {
    await requireDevRole();

    const blob = await loadBYOK();
    const providers: ProjectBYOKResponse['providers'] = {};
    for (const [id, rec] of Object.entries(blob.providers)) {
      providers[id] = {
        masked:     rec.encrypted ? maskBYOKValue(rec.encrypted) : '',
        updated_at: rec.updated_at,
      };
    }

    const body: ProjectBYOKResponse = { enabled: blob.enabled, providers };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'byok_load_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }

    const patch = (await req.json()) as ProjectBYOKPatch;
    const blob  = await loadBYOK();

    if (typeof patch.enabled === 'boolean') {
      blob.enabled = patch.enabled;
    }
    if (patch.set_provider) {
      const { id, value } = patch.set_provider;
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'invalid_provider_id' }, { status: 400 });
      }
      if (value === '') {
        delete blob.providers[id];
      } else {
        // Always encrypt before storing. The PATCH client sends plaintext
        // over TLS; we never persist plaintext to the JSONB column.
        blob.providers[id] = {
          encrypted:  await encryptSecret(value),
          updated_at: new Date().toISOString(),
        };
      }
    }

    await saveBYOK(blob);

    // Push routing invalidation so the next agent turn loads the new
    // provider keys instead of waiting for the 60s TTL on the platform's
    // cached routing snapshot. Fire-and-forget — same semantics as the
    // capabilities PATCH route. Both scopes are invalidated because BYOK
    // affects both devshell + appshell turn routing.
    void (async () => {
      try {
        const apiKey  = endpoints.cactaiApiKey;
        const baseUrl = endpoints.cactaiBase;
        const projectId = endpoints.projectId;
        if (!apiKey || !baseUrl || !projectId) return;
        await fetch(`${baseUrl}/v1/internal/routing/invalidate`, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ project_id: projectId }),
        });
      } catch {
        // Cache TTL is the floor; failure here just delays propagation.
      }
    })();

    // Return the same response shape as GET so the UI updates without a
    // second round-trip.
    const providers: ProjectBYOKResponse['providers'] = {};
    for (const [id, rec] of Object.entries(blob.providers)) {
      providers[id] = {
        masked:     rec.encrypted ? maskBYOKValue(rec.encrypted) : '',
        updated_at: rec.updated_at,
      };
    }
    const out: ProjectBYOKResponse = { enabled: blob.enabled, providers };
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: 'byok_update_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
