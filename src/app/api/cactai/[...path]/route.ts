// src/app/api/cactai/[...path]/route.ts
//
// Server-side proxy for browser-direct DevShell calls to the Cactai platform.
//
// Why this exists: the DevShell client (CactaiClient from @cactai-io/client)
// makes browser-direct POSTs to /v1/shell/{sessions,turn,event} and
// /v1/skills/regenerate. On a customer's Vercel preview deploy:
//   - The browser origin is *.vercel.app, not dashboard.cactai.io
//   - The platform's /v1/shell/* CORS only sets Access-Control-Allow-
//     Credentials=true for the dashboard origin, so credentials:'include'
//     fails preflight from any other origin
//   - Without credentials, /v1/shell/* needs Bearer auth — and exposing
//     CACTAI_API_KEY to the browser would leak the project-wide secret
//
// Solution: same-origin proxy. DevShell is mounted with
// cactaiBase='/api/cactai', so CactaiClient calls land here at
// /api/cactai/v1/shell/sessions, etc. This route:
//   1. Authenticates the caller as dev/collaborator
//   2. Reads the wizard-collected AI provider keys from the customer DB
//      (project_state.decisions.byok — same place app runtime reads its
//      own settings-configured BYOK from, just a different consumer)
//   3. Injects provider + model_api_key into the JSON body for /v1/shell/*
//      and /v1/skills/* requests so the platform handler can use them
//      per-call without ever storing the customer's AI key
//   4. Attaches CACTAI_API_KEY (project Bearer) and forwards to the
//      platform with the request body intact
//
// Auth: gated on dev/collaborator role so only the authenticated
// developer who passed the DevShell handoff can use the proxy.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';
import { createServiceSupabaseClient } from '@/lib/supabase.server';
import { decryptSecret } from '@/lib/secrets.server';

/**
 * Read + decrypt the wizard-collected AI provider key for DevShell agent
 * runs. Wizard writes these to project_state.decisions.byok.providers
 * with id 'ai.anthropic' / 'ai.openai' (encrypted with the shared
 * SECRETS_ENCRYPTION_KEY).
 *
 * Preference order: anthropic first (better agent surface today), openai
 * fallback. Returns null when neither is configured — caller surfaces a
 * clear "wizard never collected an AI key" error so the developer doesn't
 * land on a generic 412.
 */
async function readWizardAiProviderKey(): Promise<
  | { provider: 'anthropic' | 'openai'; api_key: string }
  | null
> {
  const supa = createServiceSupabaseClient();
  const { data, error } = await supa
    .from('project_state')
    .select('decisions')
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const decisions  = ((data as { decisions?: Record<string, unknown> }).decisions) ?? {};
  const byok       = (decisions['byok'] as { providers?: Record<string, { encrypted?: string }> } | undefined);
  const providers  = byok?.providers ?? {};

  const tryProvider = async (
    slot:     'ai.anthropic' | 'ai.openai',
    provider: 'anthropic' | 'openai',
  ): Promise<{ provider: 'anthropic' | 'openai'; api_key: string } | null> => {
    const enc = providers[slot]?.encrypted;
    if (typeof enc !== 'string' || !enc) return null;
    try {
      const api_key = await decryptSecret(enc);
      return { provider, api_key };
    } catch (err) {
      console.error(`[api/cactai] decryptSecret failed for ${slot}:`, (err as Error).message);
      return null;
    }
  };

  return (await tryProvider('ai.anthropic', 'anthropic'))
      ?? (await tryProvider('ai.openai',    'openai'));
}

async function forward(
  req: NextRequest,
  params: Promise<{ path: string[] }>,
): Promise<Response> {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  // requireAuth (called by requireDevRole) throws/redirects on no-session;
  // the redirect propagates as a 307 to the proxy caller, which surfaces
  // as a non-200 to CactaiClient. That's the right failure mode for an
  // unauthenticated caller.
  await requireDevRole();

  const { path } = await params;
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: 'missing_path' }, { status: 400 });
  }

  // Inject the wizard-collected AI provider key for /v1/shell/* and
  // /v1/skills/* JSON mutations. Other paths pass through unchanged.
  const isAgentMutation =
    (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') &&
    path[0] === 'v1' && (path[1] === 'shell' || path[1] === 'skills');

  let outgoingBody: string | undefined;
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const rawBody = await req.text();
    if (isAgentMutation) {
      const ai = await readWizardAiProviderKey();
      if (!ai) {
        return NextResponse.json(
          {
            error:  'no_provider_configured',
            detail: 'No DevShell AI provider key is configured in project_state.decisions.byok ' +
                    '(slot ai.anthropic or ai.openai). The wizard collects these during provision; ' +
                    'if the BYOK seed warning appeared on the project page, retry it from there.',
          },
          { status: 412 },
        );
      }
      try {
        const parsed = JSON.parse(rawBody) as Record<string, unknown>;
        parsed.provider      = ai.provider;
        parsed.model_api_key = ai.api_key;
        outgoingBody = JSON.stringify(parsed);
      } catch {
        outgoingBody = rawBody;
      }
    } else {
      outgoingBody = rawBody;
    }
  }

  const targetUrl = `${endpoints.cactaiBase.replace(/\/$/, '')}/${path.join('/')}`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      'Content-Type':  req.headers.get('content-type') ?? 'application/json',
      'Authorization': `Bearer ${endpoints.cactaiApiKey}`,
    },
    body: outgoingBody,
    cache: 'no-store',
  };

  const upstream = await fetch(targetUrl, init);

  // Pass through preserving status. Drop CORS headers — this response is
  // same-origin to the browser, no CORS dance needed.
  const respHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) respHeaders.set('content-type', ct);
  const cl = upstream.headers.get('content-length');
  if (cl) respHeaders.set('content-length', cl);

  return new NextResponse(upstream.body, {
    status:  upstream.status,
    headers: respHeaders,
  });
}

export async function GET   (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function POST  (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function PUT   (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function PATCH (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return forward(req, ctx.params); }
