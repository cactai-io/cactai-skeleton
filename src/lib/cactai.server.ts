// Server-only platform client: the ONLY place the per-project key is read
// (D-T60/D-T68 — the key never reaches the browser; provider keys never live
// here at all). Server actions and route handlers use this client; browser
// surfaces use the cookie-credentialed client in the AppShell provider.

import 'server-only';
import { CactaiClient } from '@cactai-io/platform-client';
import { endpoints } from './endpoints.js';

export function getServerClient(): CactaiClient {
  const apiKey = process.env.CACTAI_API_KEY;
  if (apiKey === undefined || apiKey === '') {
    throw new Error('CACTAI_API_KEY is not set — mint a per-project key in the Cactai Console and add it to your environment.');
  }
  return new CactaiClient({ base_url: endpoints.api, project_id: endpoints.projectId, api_key: apiKey });
}
