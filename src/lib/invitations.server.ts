// src/lib/invitations.server.ts
// Invitation-email delivery. Reads provider config from the project's
// stored settings (project_state.decisions.invitation_email_v1) and routes
// to one of:
//
//   - 'supabase': uses supabase.auth.admin.inviteUserByEmail with a
//     redirectTo pointing at /auth/accept-invitation/[token]. Delivery
//     uses the developer's Supabase email template.
//
//   - 'resend': uses the developer's stored Resend API key + from-address
//     to send a transactional email with template_html / template_text
//     pulled from the same settings blob.
//
//   - 'none' (default until configured): no-op. The inviter shares the
//     link manually. The skeleton's InvitationsCard surfaces the link.
//
// Failures emit notifications via @/lib/notifications.server so the
// developer sees them in the management panel's bell. The retry handler in
// /api/notifications/[id]/retry/route.ts calls resendInvitation() to
// replay the send for a specific invitation row.

import 'server-only';
import { createServiceSupabaseClient } from './supabase.server';
import { emit } from './notifications.server';

interface InvitationEmailConfig {
  provider:        'supabase' | 'resend' | 'none';
  // Resend-only fields:
  resend_api_key?: string;          // encrypted in storage; decrypted at read
  email_from?:    string;
  template_html?: string;
  template_text?: string;
}

interface SendOpts {
  invitation_id: string;
  to_email:      string;
  role:          string;
  token:         string;
  invited_by:    string;
}

/**
 * Fetch the project's invitation-email config from project_state.decisions.
 * Returns provider='none' when nothing is configured.
 */
async function getConfig(): Promise<InvitationEmailConfig> {
  try {
    const supa = createServiceSupabaseClient();
    const { data } = await supa
      .from('project_state')
      .select('decisions')
      .limit(1)
      .maybeSingle();
    const decisions = ((data as { decisions?: Record<string, unknown> } | null)?.decisions) ?? {};
    const cfg       = (decisions['invitation_email_v1'] ?? null) as InvitationEmailConfig | null;
    return cfg ?? { provider: 'none' };
  } catch {
    return { provider: 'none' };
  }
}

function defaultHtml(token: string, role: string, acceptUrl: string): string {
  return `
    <p>You've been invited to join as a <b>${role}</b>.</p>
    <p>Click the link below to accept. The link expires in 7 days.</p>
    <p><a href="${acceptUrl}">Accept invitation</a></p>
    <p>If you weren't expecting this, you can ignore the message.</p>
  `;
}

function defaultText(_token: string, role: string, acceptUrl: string): string {
  return `You've been invited to join as a ${role}.\n\nAccept your invitation: ${acceptUrl}\n\nThe link expires in 7 days. If you weren't expecting this, you can ignore the message.`;
}

function substituteTokens(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Send the invitation email. Selects provider based on stored config.
 * Throws on send failure AFTER emitting an developer notification so
 * the caller can decide whether to surface the error inline.
 */
export async function sendInvitationEmail(opts: SendOpts): Promise<void> {
  const cfg       = await getConfig();
  const acceptUrl = `${origin()}/auth/accept-invitation/${opts.token}`;
  const variables = {
    invitation_link: acceptUrl,
    role:            opts.role,
    app_name:        process.env.NEXT_PUBLIC_APP_NAME ?? 'the app',
  };

  if (cfg.provider === 'none') {
    return;
  }

  if (cfg.provider === 'supabase') {
    try {
      const supa = createServiceSupabaseClient();
      const { error } = await supa.auth.admin.inviteUserByEmail(opts.to_email, {
        redirectTo: acceptUrl,
        data:       { invitation_token: opts.token, role: opts.role },
      });
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      await emit({
        recipient_user_id: opts.invited_by,
        condition_key:     'invitations.send_failure',
        severity:          'error',
        title:             'Invitation email failed to send',
        body:              `The invitation to ${opts.to_email} couldn't be delivered through Supabase Auth: ${(err as Error).message}. The invitation link is still active — share it manually, or retry once the cause is fixed.`,
        action_kind:       'retry',
        action_payload:    { invitation_id: opts.invitation_id },
      });
      throw err;
    }
  }

  // resend
  const apiKey  = cfg.resend_api_key;
  const from    = cfg.email_from;
  if (!apiKey || !from) {
    await emit({
      recipient_user_id: opts.invited_by,
      condition_key:     'invitations.config_missing',
      severity:          'warning',
      title:             'Invitation email is not configured',
      body:              `Email delivery is set to Resend but the API key or from-address is missing. Configure them in the management panel's email settings to enable automatic delivery. Until then, invitation links must be shared manually.`,
      action_kind:       'navigate',
      action_payload:    { href: '/manage/email-invitations' },
    });
    return;
  }

  const html = cfg.template_html
    ? substituteTokens(cfg.template_html, variables)
    : defaultHtml(opts.token, opts.role, acceptUrl);
  const text = cfg.template_text
    ? substituteTokens(cfg.template_text, variables)
    : defaultText(opts.token, opts.role, acceptUrl);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from,
        to:      opts.to_email,
        subject: `You're invited`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`resend_${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    await emit({
      recipient_user_id: opts.invited_by,
      condition_key:     'invitations.send_failure',
      severity:          'error',
      title:             'Invitation email failed to send',
      body:              `The invitation to ${opts.to_email} couldn't be delivered through Resend: ${(err as Error).message}. The invitation link is still active — share it manually, or retry once the cause is fixed.`,
      action_kind:       'retry',
      action_payload:    { invitation_id: opts.invitation_id },
    });
    throw err;
  }
}

/**
 * Resend an invitation by looking up its row and replaying send. Called
 * by the notifications retry handler.
 */
export async function resendInvitation(invitation_id: string): Promise<void> {
  const supa = createServiceSupabaseClient();
  const { data } = await supa
    .from('tenant_invitations')
    .select('id, email, role, token, invited_by, expires_at, accepted_at')
    .eq('id', invitation_id)
    .maybeSingle();
  if (!data) throw new Error('invitation_not_found');
  if ((data as { accepted_at?: string | null }).accepted_at) throw new Error('invitation_already_accepted');
  await sendInvitationEmail({
    invitation_id: data.id as string,
    to_email:      data.email as string,
    role:          data.role as string,
    token:         data.token as string,
    invited_by:    data.invited_by as string,
  });
}

function origin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL)          return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
