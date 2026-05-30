// src/app/api/operate/env-status/route.ts
//
// Runtime check: which of the build-time env vars set by /v1/provision are
// actually present in this deploy's process.env. Symmetric to the platform's
// /v1/projects/:id/env-status, but answers the question from the *app side*:
// "did Vercel actually receive every env var the provisioner intended to set?"
//
// Returns only present/absent flags — never values, even for the NEXT_PUBLIC_*
// keys (consistency, and so the response shape doesn't suddenly leak a secret
// if a key gets re-labelled later).
//
// Access: any developer-role session (covers both /operate and DevShell's
// /dev/preferences callers). Returns only present/absent flags, never values,
// so the dev-role gate is enough — no tenant-lens narrowing required.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

interface Item {
  key:     string;
  label:   string;
  scope:   'server' | 'public' | 'build';
  present: boolean;
}

const KNOWN: Array<{ key: string; label: string; scope: Item['scope'] }> = [
  { key: 'CACTAI_API_KEY',                label: 'Cactai API key',           scope: 'server' },
  { key: 'NEXT_PUBLIC_CACTAI_PROJECT_ID', label: 'Cactai project id',        scope: 'public' },
  { key: 'NEXT_PUBLIC_CACTAI_BASE_URL',   label: 'Cactai base URL (browser)',scope: 'public' },
  { key: 'CACTAI_BASE_URL',               label: 'Cactai base URL (server)', scope: 'server' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL',      label: 'Supabase URL',             scope: 'public' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase anon key',        scope: 'public' },
  { key: 'SUPABASE_SERVICE_KEY',          label: 'Supabase service-role key',scope: 'server' },
  { key: 'ANTHROPIC_API_KEY',             label: 'Anthropic API key',        scope: 'server' },
  { key: 'OPENAI_API_KEY',                label: 'OpenAI API key',           scope: 'server' },
  { key: 'GITHUB_TOKEN',                  label: 'GitHub token',             scope: 'server' },
  { key: 'GITHUB_REPO_NAME',              label: 'GitHub repo',              scope: 'server' },
  { key: 'SECRETS_ENCRYPTION_KEY',        label: 'Secrets encryption key',   scope: 'server' },
  // CACTAI_NPM_TOKEN is consumed only by `npm install` at Vercel build time;
  // not exposed at runtime by design. Intentionally omitted.
];

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.platform_role !== 'dev' && session.platform_role !== 'collaborator') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const items: Item[] = KNOWN.map(k => ({
      key:     k.key,
      label:   k.label,
      scope:   k.scope,
      // Treat empty string as absent — Vercel sometimes returns '' for
      // unset vars in edge runtimes and we want that to read as missing.
      present: typeof process.env[k.key] === 'string' && process.env[k.key]!.length > 0,
    }));

    // The wizard requires *at least one* of Anthropic / OpenAI. Surface that
    // as a derived flag so the UI can render a single "AI provider ready"
    // status in addition to the individual rows.
    const anthropicOk = items.find(i => i.key === 'ANTHROPIC_API_KEY')?.present ?? false;
    const openaiOk    = items.find(i => i.key === 'OPENAI_API_KEY')?.present    ?? false;

    return NextResponse.json({
      items,
      ai_provider_ready: anthropicOk || openaiOk,
      vercel_project_url: null,
      note: 'Runtime readout of build-time env vars set by /v1/provision. Edit in your Vercel project settings, then redeploy to pick up changes.',
    });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}
