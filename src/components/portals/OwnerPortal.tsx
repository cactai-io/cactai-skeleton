// @prune:user_portal.owner_only:start
// The single-tenant user portal: the app-owner's surface over the one shared
// space (D-T80). No tenant layer exists in this variant.

import type { JSX } from 'react';

export function OwnerPortal(): JSX.Element {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Users</h1>
      <p>Everyone in your app's shared space. Invite, suspend, and manage users here.</p>
    </main>
  );
}
// @prune:user_portal.owner_only:end
