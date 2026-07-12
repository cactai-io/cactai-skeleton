// Root layout: theme tokens, PWA registration, base document. Thin by design —
// the skeleton is your app plus the AppShell host; Cactai intelligence lives
// behind @cactai-io/platform-client, never in this repo.

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cactaiConfig } from '@/lib/config';
import { ServiceWorkerRegistrar } from './sw-registrar';

const config = cactaiConfig();

export const metadata: Metadata = {
  title: config.app.name,
  description: config.app.description,
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
