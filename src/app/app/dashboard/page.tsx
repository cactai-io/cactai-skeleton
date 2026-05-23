// src/app/app/dashboard/page.tsx
// App dashboard — the main landing page for end users.
// This stub is replaced by the agent during workflow Stage 8 with
// the actual dashboard UI based on the developer's described workflow.
// Styling references /config/design/ — never hardcoded here.
// Consumes theme via CSS custom properties from @cactai-io/brand-tokens.

import { requireAppRole } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await requireAppRole();

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        Welcome
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 14 }}>
        You are signed in as {user.email} ({user.active_lens ?? user.platform_role ?? 'user'}).
        The agent will build out this dashboard during the workflow.
      </p>
    </main>
  );
}
