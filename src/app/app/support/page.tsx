// src/app/app/support/page.tsx
//
// End-user support — open a ticket and chat with the app's team. Ships in the
// skeleton so every Cactai app has support on day one. Operators (the developer
// + scoped Portal staff) read and reply from the Cactai Portal's Support
// section; messages flow both ways through support_tickets/support_messages on
// this app's own database.
//
// Auth: any signed-in end user. Each user sees only their own tickets.

import { requireAuth } from '@/lib/auth';
import { SupportClient } from './SupportClient';

export default async function SupportPage() {
  await requireAuth();
  return (
    <div style={{ padding: 40, maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--c-text, #e8e8f0)' }}>
        Support
      </h1>
      <p style={{ color: 'var(--c-text-2, #8B8B9F)', fontSize: 14, marginBottom: 24 }}>
        Need help? Open a ticket and the team will reply here. You can keep the
        conversation going until it's resolved.
      </p>
      <SupportClient />
    </div>
  );
}
