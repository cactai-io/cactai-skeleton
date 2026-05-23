// vitest.config.ts
// Test configuration for the skeleton. Tests live co-located with source as
// *.test.ts. Mocks are hand-rolled (see Decision 3 of the v1.2.4 test
// infrastructure: no real Supabase, no DB; tests target flow logic).
//
// path alias `@/` mirrors the Next.js convention defined in tsconfig.json.

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment:   'node',
    globals:       false,
    include:       ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude:       ['node_modules', '.next', 'dist'],
    // Tests should be deterministic; isolate each test file so module-level
    // state doesn't leak between files.
    isolate:       true,
    // Co-located tests run alongside the source they cover. Coverage is
    // off by default — enable with `vitest --coverage` locally.
    coverage: {
      provider:    'v8',
      reporter:    ['text', 'html'],
      include:     ['src/**/*.ts', 'src/**/*.tsx'],
      exclude:     ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
