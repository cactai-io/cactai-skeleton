// next.config.mjs
// Skeleton app Next.js configuration.
// Configuration is driven by skeleton.config.json — the agent writes there;
// this file reads it and translates to next.config shape.
//
// Next.js 15 supports next.config.ts. This file stays .mjs for now since the
// config is purely declarative; migrate to .ts if/when typed config helpers
// are needed.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'skeleton.config.json'), 'utf8'));
const imageDomains = config.media?.image_domains ?? [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile @cactai-io/* packages (published as ESM from GitHub Packages).
  // v1.3.5 — include every @cactai-io/* the skeleton actually imports so
  // Next preserves `"use client"` directives across module boundaries
  // (the compiled dist/ outputs don't carry the directive at the top of
  // every file; transpiling from source has Next handle the boundary).
  transpilePackages: [
    '@cactai-io/primitives',
    '@cactai-io/themes',
    '@cactai-io/types',
    '@cactai-io/client',
    '@cactai-io/brand-tokens',
    '@cactai-io/mui',
    '@cactai-io/shell-ui',
    '@cactai-io/devshell',
  ],

  // Image domains read from skeleton.config.json media section.
  // Add domains there, not here.
  images: {
    remotePatterns: imageDomains.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },

  env: {},
};

export default nextConfig;
