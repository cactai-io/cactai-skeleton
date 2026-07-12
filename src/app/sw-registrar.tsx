// PWA: registers the service worker (installable app state — web manifest +
// service worker + standalone display; D54).

'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);
  return null;
}
