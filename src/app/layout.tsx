// src/app/layout.tsx
// Root layout — applies theme tokens, sets base document structure.

import type { Metadata } from 'next';
import { ThemeProvider } from './ThemeProvider';

export const metadata: Metadata = {
  title: 'App',
  description: 'Built on Cactai',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
