// src/lib/cactai.ts
// CactaiClient instantiation for server-side use (route handlers, middleware).
// The client is a thin HTTP client to api.cactai.io. All AI IP runs on the
// platform server.

import { endpoints } from './endpoints';
import 'server-only';
import { CactaiClient } from '@cactai-io/client';
import type { AppRole } from './auth';

/** Create a server-side Cactai client. Uses the project API key (server-only)
 *  for authentication. */
export function getCactaiClient(): CactaiClient {
  const apiKey  = endpoints.cactaiApiKey;
  const baseUrl = endpoints.cactaiBase;
  if (!apiKey) {
    throw new Error(
      'CACTAI_API_KEY is not set. ' +
      'For local development, copy .env.example to .env.local and fill in your key.',
    );
  }
  const projectId = endpoints.projectId;
  if (!projectId) {
    throw new Error(
      'NEXT_PUBLIC_CACTAI_PROJECT_ID is not set. ' +
      'Provisioning sets this automatically; for local development copy it from the Cactai dashboard.',
    );
  }
  return new CactaiClient({
    base_url:   baseUrl,
    project_id: projectId,
    api_key:    apiKey,
  });
}

/** Open a session on behalf of a user. Returns the session ref + initial tree. */
export async function openSessionFor(opts: {
  userId:    string;
  role:      AppRole;
  shell:     'dev' | 'app' | 'manage';
  tenantId?: string;
  email?:    string;
}) {
  const client = getCactaiClient();
  return client.openSession({
    shell:      opts.shell,
    user_id:    opts.userId,
    user_role:  opts.role,
    tenant_id:  opts.tenantId,
    user_email: opts.email,
    viewport:   null,  // server-side opens — viewport will be re-supplied on first turn
  });
}
