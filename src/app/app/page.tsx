// src/app/app/page.tsx
// Default landing inside /app/* — redirects to the dashboard.
// Without this file, anyone redirected to /app by requireAppRole would hit
// a 404. The layout already enforces the role check; this just routes the
// user to the correct landing surface.

import { redirect } from 'next/navigation';

export default function AppIndex() {
  redirect('/app/dashboard');
}
