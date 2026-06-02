// src/app/manage/signup-policy/page.tsx
// Management-panel page for the app's signup policy (who can sign up and
// what default role they receive).

import { requireManageRole } from '@/lib/auth';
import { SignupPolicyCard } from '../components/SignupPolicyCard';

export default async function SignupPolicyPage() {
  await requireManageRole();
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 4, color: 'var(--c-text)' }}>
        Signup policy
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 13.5, marginBottom: 28, lineHeight: 1.6 }}>
        Control who can create accounts in your app and what role they receive
        on signup.
      </p>
      <SignupPolicyCard />
    </div>
  );
}
