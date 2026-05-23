// src/app/dev/layout.tsx
// Stub layout for /dev/*. The actual DevShell client ships in the
// @cactai-io/devshell package and is dynamically imported by page.tsx below.
// This layout's sole jobs are:
//   1. Hard-404 the entire /dev/* tree in production builds. Combined with
//      @cactai-io/devshell living in devDependencies (not dependencies), the
//      production deploy contains neither the import nor any reachable
//      route — both layers fail closed.
//   2. Run the developer role-check once at the layout boundary so child
//      pages don't repeat it.

import { notFound } from 'next/navigation';
import { requireDevRole } from '@/lib/auth';

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    notFound();
  }
  await requireDevRole();
  return <>{children}</>;
}
