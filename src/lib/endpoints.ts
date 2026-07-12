// Platform endpoints and the project identity — the single source the app
// reads them from. The per-project key is SERVER-ONLY (see cactai.server.ts);
// only the project id and public endpoints reach the browser.

export const endpoints = {
  api: process.env.NEXT_PUBLIC_CACTAI_BASE_URL ?? 'https://api.cactai.io',
  id: process.env.NEXT_PUBLIC_CACTAI_ID_URL ?? 'https://id.cactai.io',
  projectId: process.env.NEXT_PUBLIC_CACTAI_PROJECT_ID ?? '',
} as const;
