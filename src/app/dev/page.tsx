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
import { DevShellWithThumbnail } from './_with-thumbnail';

export default async function DevPage() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    notFound();
  }
  const user = await requireDevRole();
  // The DevShellPage import + thumbnail capture both live in a client
  // wrapper component — server components can't mount effects, and
  // dynamic-import-of-DevShell must happen client-side so the bundle
  // tree-shakes correctly for production builds.
  return (
    <DevShellWithThumbnail
      userId={user.id}
      userEmail={user.email}
      userRole={user.platform_role ?? user.active_lens ?? 'user'}
      allRoles={user.all_roles}
      cactaiBase={endpoints.cactaiBase}
      projectId={endpoints.projectId}
    />
  );
}
