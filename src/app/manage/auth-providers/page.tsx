// src/app/manage/auth-providers/page.tsx
// Management-panel page for AppShell sign-in providers (Google and Apple
// OAuth credentials).

import { requireManageRole } from '@/lib/auth';
import { AppShellAuthCard } from '../components/AppShellAuthCard';

export default async function AuthProvidersPage() {
  await requireManageRole();
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)' }}>
        Sign-in providers
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 13.5, marginBottom: 28, lineHeight: 1.6 }}>
        Configure the OAuth providers your app's end users can sign in with.
        Initial values came from the setup wizard; update here as needed.
      </p>
      <AppShellAuthCard />
    </div>
  );
}
