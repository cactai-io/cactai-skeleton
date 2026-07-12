// Next config — thin by design. Image domains come from cactai.config.json;
// the @cactai-io UI packages ship compiled dist and need no transpilation.
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('./cactai.config.json', import.meta.url), 'utf8'));

/** @type {import('next').NextConfig} */
export default {
  images: {
    remotePatterns: (config.media?.image_domains ?? []).map((hostname) => ({ protocol: 'https', hostname })),
  },
};
