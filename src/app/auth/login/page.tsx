// Sign in with Cactai (E5): the id surface issues an app-side token whose
// subject is pairwise-pseudonymous — this app can never resolve the root or
// correlate the user across apps. The button starts the id.cactai.io flow;
// the callback route stores the returned token.

import { endpoints } from '@/lib/endpoints';
import { cactaiConfig } from '@/lib/config';

export default function LoginPage() {
  const config = cactaiConfig();
  const authorize = `${endpoints.id}/authorize?audience=${encodeURIComponent(endpoints.projectId)}&redirect_uri=${encodeURIComponent('/auth/callback')}`;
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div>
        <h1>{config.app.name}</h1>
        <a href={authorize} data-sign-in-with-cactai="true">Sign in with Cactai</a>
      </div>
    </main>
  );
}
