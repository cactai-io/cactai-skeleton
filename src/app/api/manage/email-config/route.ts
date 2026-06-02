// src/app/api/manage/email-config/route.ts
// Read and write the project's invitation-email provider configuration.
// Stored at project_state.decisions.invitation_email_v1.
//
// Access: super_admin lens only. The configuration affects how invitations
// to NEW users are sent — admin-and-below shouldn't be able to change it.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase.server';

interface Config {
  provider:        'supabase' | 'resend' | 'none';
  resend_api_key?: string;
  email_from?:    string;
  template_html?: string;
  template_text?: string;
}

function isSuperAdmin(activeLens: string | null): boolean {
  return activeLens === 'super_admin';
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (!isSuperAdmin(session.active_lens)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const supa = createServiceSupabaseClient();
    const { data } = await supa
      .from('project_state')
      .select('decisions')
      .limit(1)
      .maybeSingle();
    const decisions = ((data as { decisions?: Record<string, unknown> } | null)?.decisions) ?? {};
    const cfg = ((decisions['invitation_email_v1'] ?? { provider: 'none' }) as Config);
    // Mask the API key in the response — never echo plaintext secrets back
    // to the client. The form-bound state shows "••••••••" until the
    // developer types a new value, which fully replaces the stored key.
    const masked: Config = {
      ...cfg,
      resend_api_key: cfg.resend_api_key ? '••••••••' : undefined,
    };
    return NextResponse.json({ config: masked });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!isSuperAdmin(session.active_lens)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => null) as Config | null;
    if (!body || !['supabase', 'resend', 'none'].includes(body.provider)) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const supa = createServiceSupabaseClient();

    // Load existing config to preserve the API key when the client sends
    // the masked sentinel (•••••••• means "keep what's stored").
    const { data: existing } = await supa
      .from('project_state')
      .select('id, decisions')
      .limit(1)
      .maybeSingle();
    const decisions = ((existing as { decisions?: Record<string, unknown> } | null)?.decisions) ?? {};
    const prev = (decisions['invitation_email_v1'] ?? { provider: 'none' }) as Config;

    let nextKey = body.resend_api_key;
    if (nextKey === '••••••••' || nextKey === undefined) {
      nextKey = prev.resend_api_key;
    }

    const merged: Config = {
      provider:        body.provider,
      resend_api_key:  body.provider === 'resend' ? nextKey : undefined,
      email_from:      body.provider === 'resend' ? body.email_from : undefined,
      template_html:   body.template_html ?? prev.template_html,
      template_text:   body.template_text ?? prev.template_text,
    };

    const nextDecisions = { ...decisions, invitation_email_v1: merged };

    if (existing && (existing as { id?: string }).id) {
      await supa
        .from('project_state')
        .update({ decisions: nextDecisions })
        .eq('id', (existing as { id: string }).id);
    } else {
      await supa.from('project_state').insert({ decisions: nextDecisions });
    }

    const { audit } = await import('@/lib/audit.server');
    await audit({
      user_id:   session.id,
      tenant_id: session.tenant_id,
      lens:      session.active_lens as never,
      action:    'email_config.updated',
      metadata:  { provider: merged.provider },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'internal', detail: (err as Error).message }, { status: 500 });
  }
}
