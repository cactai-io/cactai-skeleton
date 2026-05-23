#!/usr/bin/env node
// scripts/verify-studio-preview-gating.mjs
//
// Verifies that GET /_studio/preview returns:
//   - HTTP 404 when STUDIO_PREVIEW_ENABLED is unset / not 'true'
//   - HTTP 200 when STUDIO_PREVIEW_ENABLED='true'
//
// Run against a live `pnpm dev` instance:
//   STUDIO_PREVIEW_ENABLED=false pnpm dev
//   node scripts/verify-studio-preview-gating.mjs http://localhost:3000
//
//   STUDIO_PREVIEW_ENABLED=true  pnpm dev
//   node scripts/verify-studio-preview-gating.mjs http://localhost:3000
//
// Exits 0 on expected status, 1 otherwise. Suitable for a CI smoke-test
// matrix that flips the env var.

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const path    = '/_studio/preview';
const expected = process.env.STUDIO_PREVIEW_ENABLED === 'true' ? 200 : 404;

const url = `${baseUrl}${path}`;
const res = await fetch(url, { redirect: 'manual' });

console.log(`GET ${url}`);
console.log(`  STUDIO_PREVIEW_ENABLED=${process.env.STUDIO_PREVIEW_ENABLED ?? '(unset)'}`);
console.log(`  expected: ${expected}`);
console.log(`  actual:   ${res.status}`);

if (res.status !== expected) {
  console.error(`✗ status mismatch (got ${res.status}, expected ${expected})`);
  process.exit(1);
}
console.log('✓ ok');
