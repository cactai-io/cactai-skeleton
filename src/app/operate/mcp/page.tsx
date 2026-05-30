// src/app/operate/mcp/page.tsx
//
// AppShell MCP (personal) — each end user manages THEIR own MCP
// integrations, scoped to their own sessions. One of the four MCP
// surfaces (memory: mcp-integration-architecture.md).
//
// Path note: this page sits under /operate/* so it's gated by
// requireOperatorRole through the parent layout — sufficient for sprint 1
// owner-side UX testing. The page semantically belongs to "every end
// user" (the API at /api/mcp/servers is scoped by session.id and works
// for any authenticated user), so a future placement decision may move
// this surface to a path without the operator-role gate (e.g. /mcp or
// /account/mcp) so real end users can reach it.
//
// Storage: skeleton-direct /api/mcp/servers (per-user table on the
// customer DB; v2-envelope-encrypted tokens). No platform proxy needed.
//
// Sprint 1 is UI-only — connections persist but no orchestrator
// dispatches calls. MCPManager surfaces a "Preview — activating coming
// soon" banner.

import { AppShellPersonalMCPClient } from './AppShellPersonalMCPClient';

export default function AppShellPersonalMCPPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)' }}>
        Personal integrations
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 13.5, marginBottom: 24, lineHeight: 1.6 }}>
        Connect your own accounts so the assistant can work with the
        tools you already use. These integrations are private to you —
        nobody else using this app can see what you&apos;ve connected.
      </p>
      <AppShellPersonalMCPClient />
    </div>
  );
}
