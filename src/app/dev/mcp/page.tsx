// src/app/dev/mcp/page.tsx
//
// AppShell MCP (shared) — the builder-owner configures MCP integrations
// that EVERY end-user session in the deployed app will have access to.
// One of the four MCP surfaces (memory: mcp-integration-architecture.md).
//
// Lives under /dev/* so it's gated by the dev/collaborator role + 404s
// in production (the /dev/layout.tsx handles both). The owner manages
// the shared catalog from the preview/DevShell environment; end users
// of the deployed app don't see this page.
//
// Storage routes via the existing /api/cactai proxy to the platform's
// /v1/projects/:id/mcp/app_default endpoints (built in mcp.ts).
//
// Sprint 1 is UI-only — connections persist but no orchestrator
// dispatches calls. MCPManager surfaces a "Preview — activating coming
// soon" banner so this isn't mistaken for working.

import { featureEnabled } from '@/lib/features';
import { AppShellSharedMCPClient } from './AppShellSharedMCPClient';

export default async function AppShellSharedMCPPage() {
  // Flag-only capability: MCP is never pruned, but the developer can turn it
  // off (App Configuration → Integrations). Off → this config surface goes
  // dormant; flip the flag back on to restore it.
  if (!(await featureEnabled('mcp'))) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)' }}>
          Integrations
        </h1>
        <p style={{ color: 'var(--c-text-2)', fontSize: 13.5, lineHeight: 1.6 }}>
          MCP integrations are turned off for this app.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)' }}>
        Integrations (shared with all users)
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 13.5, marginBottom: 24, lineHeight: 1.6 }}>
        These integrations are part of your deployed app&apos;s baseline
        capabilities — every end user benefits from them automatically.
        For tools that should be private to each user, switch them to
        the personal integrations page.
      </p>
      <AppShellSharedMCPClient />
    </div>
  );
}
