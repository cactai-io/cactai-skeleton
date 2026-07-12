// The PWA web manifest, derived from cactai.config (D54: installable app —
// manifest, service worker, standalone display).

import type { MetadataRoute } from 'next';
import { cactaiConfig } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  const config = cactaiConfig();
  return {
    name: config.app.name,
    short_name: config.app.name,
    description: config.app.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
