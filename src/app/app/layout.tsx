// The signed-in app region: everything under /app renders inside the shell.

import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
