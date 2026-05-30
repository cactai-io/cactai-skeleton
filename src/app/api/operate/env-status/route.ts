// src/app/api/operate/env-status/route.ts
//
// Runtime check of build-time env vars + DevShell BYOK status. Answers the
// question from the *app side*: "did the wizard's provisioner actually wire
// everything this deploy needs to function?"
//
// Two reads:
//   1. process.env probe for the build-env vars the wizard sets on Vercel
//      (Supabase URLs, service keys, Cactai API key, etc.).
//   2. customer DB read of project_state.decisions.byok to surface the
//      DevShell AI provider keys the wizard writes there (NOT to env vars
//      by design — see provision.ts envVars list; AI keys live in the
//      customer DB and the /api/cactai proxy reads them from there to
//      inject into every platform shell call).
//
// Returns only present/absent flags — never values. Access: any dev /
// collaborator session (covers /operate and DevShell's /dev/preferences).

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

interface Item {
  key:     string;
  label:   string;
  scope:   'env' | 'byok';
  present: boolean;
}

// Vercel env vars the wizard sets via /v1/provision step 3. AI keys
// (ANTHROPIC_API_KEY / OPENAI_API_KEY) + GitHub creds (GITHUB_TOKEN /
// GITHUB_REPO_NAME) are intentionally absent — provision.ts doesn't write
// them as env vars; they live in customer DB BYOK (see provision.ts
// envVars array comments).
const KNOWN_ENV: Array<{ key: string; label: string }> = [
  { key: 'CACTAI_API_KEY',                label: 'Cactai API key'            },
  { key: 'NEXT_PUBLIC_CACTAI_PROJECT_ID', label: 'Cactai project id'         },
  { key: 'NEXT_PUBLIC_CACTAI_BASE_URL',   label: 'Cactai base URL (browser)' },
  { key: 'CACTAI_BASE_URL',               label: 'Cactai base URL (server)'  },
  { key: 'NEXT_PUBLIC_SUPABASE_URL',      label: 'Supabase URL'              },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase anon key'         },
  { key: 'SUPABASE_SERVICE_KEY',          label: 'Supabase service-role key' },
  { key: 'SUPABASE_DATABASE_URL',         label: 'Supabase DSN'              },
  { key: 'SECRETS_ENCRYPTION_KEY',        label: 'Secrets encryption key'    },
];

// Customer DB BYOK slots — same shape the wizard's seedCustomerByokKeys
// writes (project_state.decisions.byok.providers["ai.<provider>"]).
const KNOWN_BYOK: Array<{ slot: string; label: string }> = [
  { slot: 'ai.anthropic', label: 'Anthropic API key' },
  { slot: 'ai.openai',    label: 'OpenAI API key'    },
];

async function readByokProviders(): Promise<Set<string>> {
  try {
    const supa = createServiceSupabaseClient();
    const { data } = await supa
      .from('project_state')
      .select('decisions')
      .limit(1)
      .maybeSingle();
    const decisions = ((data as { decisions?: Record<string, unknown> } | null)?.decisions) ?? {};
    const byok      = decisions['byok'] as { providers?: Record<string, { encrypted?: string }> } | undefined;
    const providers = byok?.providers ?? {};
    const out = new Set<string>();
    for (const [slot, p] of Object.entries(providers)) {
      if (p && typeof p.encrypted === 'string' && p.encrypted.length > 0) {
        out.add(slot);
      }
    }
    return out;
  } catch {
    return new Set();
  }
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const envItems: Item[] = KNOWN_ENV.map(k => ({
      key:     k.key,
      label:   k.label,
      scope:   'env',
      // Treat empty string as absent — Vercel sometimes returns '' for
      // unset vars in edge runtimes and we want that to read as missing.
      present: typeof process.env[k.key] === 'string' && process.env[k.key]!.length > 0,
    }));

    const byokPresent = await readByokProviders();
    const byokItems: Item[] = KNOWN_BYOK.map(k => ({
      key:     k.slot,
      label:   k.label,
      scope:   'byok',
      present: byokPresent.has(k.slot),
    }));

    const aiReady = byokPresent.has('ai.anthropic') || byokPresent.has('ai.openai');

    return NextResponse.json({
      items: [...envItems, ...byokItems],
      ai_provider_ready:  aiReady,
      vercel_project_url: null,
      note: 'Vercel env vars come from the wizard\'s /v1/provision step 3. DevShell AI keys come from the wizard and live in the customer DB (project_state.decisions.byok); the /api/cactai proxy reads them per-call to inject into platform shell requests.',
    });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}
