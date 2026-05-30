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
//   3. Load brand-tokens CSS so DevShell's --c-* variables resolve. The
//      shell's surfaces, borders, text, and motion all read from these
//      vars; without them the IDE renders with browser defaults (flat
//      white, no borders, no depth).

import { notFound } from 'next/navigation';
import { requireDevRole } from '@/lib/auth';
import '@cactai-io/brand-tokens/tokens.css';
import '@cactai-io/brand-tokens/motion.css';

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    notFound();
  }
  await requireDevRole();
  return <>{children}</>;
}
