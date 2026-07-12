// Root page: signed-in users land in the app; everyone else goes to sign-in.
// Provisioning gaps surface visibly (missing project id), never as a blank page.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { endpoints } from '@/lib/endpoints';

export default async function RootPage() {
  if (endpoints.projectId === '') {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
        <div>
          <h1>Almost there</h1>
          <p>Provisioning has not completed: NEXT_PUBLIC_CACTAI_PROJECT_ID is not set.</p>
          <p>Finish the setup wizard in the Cactai Console, then redeploy.</p>
        </div>
      </main>
    );
  }
  const session = (await cookies()).get('cactai_app_token');
  redirect(session === undefined ? '/auth/login' : '/app');
}
