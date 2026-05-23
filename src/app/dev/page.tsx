// src/app/dev/page.tsx
// DevShell landing stub. The actual IDE client lives in @cactai-io/devshell;
// this file dynamically imports it at request time, gated on environment.
//
// In production (VERCEL_ENV='production') the layout.tsx above has already
// called notFound() and the import is unreachable. Webpack tree-shakes
// unreachable dynamic imports when the gating literal can be inlined; the
// devDependency placement ensures the package isn't even installed for the
// production build, so a runtime evaluation would also fail to resolve.

import { notFound } from 'next/navigation';
import { requireDevRole } from '@/lib/auth';
import { endpoints } from '@/lib/endpoints';

export default async function DevPage() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    notFound();
  }
  const user = await requireDevRole();
  const { DevShellPage } = await import('@cactai-io/devshell');
  return (
    <DevShellPage
      userId={user.id}
      userEmail={user.email}
      userRole={user.platform_role ?? user.active_lens ?? 'user'}
      allRoles={user.all_roles}
      endpoints={{
        cactaiBase: endpoints.cactaiBase,
        projectId:  endpoints.projectId,
      }}
      preferencesHref="/dev/preferences"
    />
  );
}
