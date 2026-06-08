// src/app/app/layout.tsx
// App shell layout — wraps all /app/* routes for non-dev users.
// Role-checked: redirects to /dev if user is dev/collaborator.
// Renders the app's navigation and shell — styled by the active theme from skeleton.config.json.
//
// The agent generates the actual navigation and shell components during workflow Stage 8.
// This file is a stub that provides role protection and a minimal wrapper.

import { requireAppRole } from '@/lib/auth';
import { featureEnabled } from '@/lib/features';
import { AppShellProvider } from './AppShellProvider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppRole();
  const supportEnabled = await featureEnabled('support');

  return (
    <AppShellProvider user={user} supportEnabled={supportEnabled}>
      {children}
    </AppShellProvider>
  );
}
