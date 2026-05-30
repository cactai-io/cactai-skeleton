// src/app/operate/build-status/page.tsx
//
// Operator-panel page that surfaces the runtime build-env status — i.e. did
// every env var the provisioner set actually land in this deploy's
// process.env. Symmetric to the platform's project-page Env Var Status.

import { requireOperatorRole } from '@/lib/auth';
import { EnvStatusCard } from '../components/EnvStatusCard';

export default async function BuildStatusPage() {
  await requireOperatorRole();
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)' }}>
        Build status
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 13.5, marginBottom: 28, lineHeight: 1.6 }}>
        Read-only status of the env vars set by the platform&apos;s provisioner.
        Use this to confirm the deploy picked up every value, and to spot
        what&apos;s missing if behavior is unexpected.
      </p>
      <EnvStatusCard />
    </div>
  );
}
