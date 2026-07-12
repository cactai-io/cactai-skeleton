// The AppShell host (client): wraps the app's GAS mount in the shell chrome
// (@cactai-io/shell-ui AppShellHost) and binds the platform session through
// @cactai-io/platform-client. The default profile renders until the developer
// authors their own (@cactai-io/profile-scaffold DEFAULT_PROFILE_MANIFEST).
// The tenant switcher block below is prune-gated: the provisioning wizard's
// recorded tenancy answer selects the variant (D-T80).

'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import { CactaiClient, type PrimitiveNode } from '@cactai-io/platform-client';
import { AppShellHost, type ShellTenancy, type ShellTokens } from '@cactai-io/shell-ui';
import { PrimitiveTreeRenderer } from '@cactai-io/primitives';
import { SAMTheme } from '@cactai-io/themes';
import { DEFAULT_PROFILE_MANIFEST } from '@cactai-io/profile-scaffold';
import { cactaiConfig } from '@/lib/config';
import { endpoints } from '@/lib/endpoints';
// @prune:tenancy.multi:start
import { TenantSwitcher } from '@/components/tenant-switcher/TenantSwitcher';
import { useActiveTenant } from '@/lib/tenancy';
// @prune:tenancy.multi:end

const SHELL_TOKENS: ShellTokens = {
  bg: 'var(--bg, #ffffff)', bgRaised: 'var(--bg-raised, #f6f6f6)', border: 'var(--border, #e2e2e2)',
  text: 'var(--text, #111111)', textMuted: 'var(--text-muted, #555555)', textSubtle: 'var(--text-subtle, #888888)',
  hoverBg: 'var(--hover, #eeeeee)', focusRing: 'var(--focus, #3366ff)',
  info: '#2563eb', warning: '#d97706', error: '#dc2626', blocking: '#7f1d1d',
  radius: '8px', font: 'system-ui, sans-serif',
};

export function AppShellProvider(): JSX.Element {
  const config = cactaiConfig();
  const client = useMemo(
    () => new CactaiClient({ base_url: endpoints.api, project_id: endpoints.projectId }),
    [],
  );
  const [tree, setTree] = useState<PrimitiveNode | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    void client
      .openSession({ shell: 'app', user_id: 'session', viewport: null })
      .then((session) => {
        setSessionId(session.session_id);
        setTree(session.initial_tree ?? null);
      });
  }, [client]);

  let tenancy: ShellTenancy | null = null;
  // @prune:tenancy.multi:start
  const activeTenant = useActiveTenant();
  tenancy = activeTenant === null ? null : { active_tenant_label: activeTenant.display_name, switch_items: [] };
  // @prune:tenancy.multi:end

  return (
    <AppShellHost
      tokens={SHELL_TOKENS}
      appName={config.app.name}
      identity={{ display_name: 'You', initials: 'Y' }}
      nav={[{ label: 'Home', href: '/app', active: true }]}
      tenancy={tenancy}
      accountMenu={[
        { kind: 'link', label: 'Manage users', href: '/manage/users' },
        // @prune:tenancy.multi
        { kind: 'link', label: 'Tenants', href: '/manage/tenants' },
        { kind: 'divider' },
        { kind: 'button', label: 'Sign out', onClick: () => { void fetch('/auth/sign-out', { method: 'POST' }); } },
      ]}
    >
      {tree !== null && sessionId !== null ? (
        <PrimitiveTreeRenderer
          root={tree}
          theme={SAMTheme}
          postEvent={async (targetId, payload) => {
            const next = await client.postEvent({ session_id: sessionId, target_id: targetId, payload: payload as Record<string, unknown> | undefined });
            if (next.tree !== undefined) setTree(next.tree);
          }}
        />
      ) : (
        <p style={{ padding: '2rem' }}>
          Starting {config.app.name} on the {DEFAULT_PROFILE_MANIFEST.intents.length}-intent default profile…
        </p>
      )}
    </AppShellHost>
  );
}
