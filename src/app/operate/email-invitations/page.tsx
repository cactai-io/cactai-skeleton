// src/app/operate/email-invitations/page.tsx
// Operator-panel page for email delivery configuration AND outstanding
// invitations. Combines the two concerns since they're closely related:
// the email config determines how invitations get sent.

import { requireOperatorRole } from '@/lib/auth';
import { EmailConfigCard } from '../components/EmailConfigCard';
import { InvitationsCard } from '../components/InvitationsCard';

export default async function EmailInvitationsPage() {
  await requireOperatorRole();
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)' }}>
        Email &amp; invitations
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 13.5, marginBottom: 28, lineHeight: 1.6 }}>
        Configure how invitation emails get delivered, then create and manage
        invitations. Missing email config means invitations create a shareable
        link only — you'll need to forward it manually.
      </p>
      <EmailConfigCard />
      <InvitationsCard />
    </div>
  );
}
