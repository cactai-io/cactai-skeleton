// src/lib/capture-thumbnail.ts
//
// Captures the current viewport as a JPEG thumbnail and POSTs it to the
// Cactai platform so the developer's project card on
// dashboard.cactai.io can show a snapshot of the DevShell IDE (preview)
// and the production login screen instead of just the project name.
//
// CAPTURE POINTS (intentionally minimal — no rolling intervals)
//   - Sign-on: once when the page mounts. Captures the initial state.
//   - Sign-off / tab close: once on `pagehide`, sent via navigator
//     .sendBeacon so the request survives the page unload.
//
// Two callers in this skeleton:
//   - /dev/page.tsx wraps DevShell with installCaptureHandlers,
//     tagged kind='preview'.
//   - /auth/login/page.tsx fires once-on-mount via installCaptureHandlers,
//     tagged kind='production' (the login screen is the deployed app's
//     public face).
//
// The capture itself uses html-to-image (~13KB gzipped, no transitive
// deps). It walks the live DOM and renders an inline SVG into a
// canvas — works for our same-origin React UI, breaks for cross-origin
// iframes and tainted canvases (neither apply here).
//
// Privacy: thumbnails contain whatever the developer was looking at in
// DevShell. The platform endpoint is tenant-access-gated so only
// project members can fetch them. We resize to 480px wide at JPEG
// quality 0.6, so a typical capture is 20-40 KB — manageable in
// Postgres bytea without external storage.

import { toJpeg } from 'html-to-image';

const TARGET_WIDTH = 480;     // px — fits the dashboard card without bloat
const JPEG_QUALITY = 0.6;     // 60% — visually fine for thumbnails
const MAX_BYTES    = 200_000; // 200KB hard cap, server rejects larger

/** Capture the current document.body and POST the JPEG to the platform. */
export async function captureAndUpload(opts: {
  cactaiBase: string;
  projectId:  string;
  kind:       'preview' | 'production';
  /** If true, use sendBeacon (fire-and-forget; survives pagehide). */
  beacon?:    boolean;
}): Promise<void> {
  let dataUrl: string;
  try {
    // Capture document.body. The library handles DPR + computed-style
    // copying. Height is auto-derived from body aspect, capped at 360
    // so very tall pages don't bloat the blob.
    dataUrl = await toJpeg(document.body, {
      quality:    JPEG_QUALITY,
      width:      TARGET_WIDTH,
      height:     Math.min(360, Math.round(document.body.scrollHeight * (TARGET_WIDTH / Math.max(1, document.body.scrollWidth)))),
      pixelRatio: 1,
      cacheBust:  true,
      // Anything tagged [data-cactai-no-thumbnail] gets excluded
      // (e.g. transient toast hosts, modals).
      filter:     (node: HTMLElement) => {
        if (!(node instanceof Element)) return true;
        return !node.hasAttribute('data-cactai-no-thumbnail');
      },
    });
  } catch (err) {
    // Capture can fail on pages with cross-origin fonts/images. Log
    // and bail — a missing thumbnail is preferable to a broken page.
    console.warn('[thumbnail] capture failed:', err);
    return;
  }

  if (dataUrl.length > MAX_BYTES * 1.4 /* base64 overhead */) {
    console.warn('[thumbnail] capture exceeds size cap, skipping upload');
    return;
  }

  // Endpoint lives at /v1/project-thumbnails/:id (intentionally outside
  // the /v1/projects/:id namespace so the dashboard-session cookie
  // middleware doesn't apply — see api/src/routes/developer.ts).
  const url  = `${opts.cactaiBase.replace(/\/$/, '')}/v1/project-thumbnails/${opts.projectId}`;
  const body = JSON.stringify({ kind: opts.kind, image_data_url: dataUrl });

  // sendBeacon for pagehide — survives tab close, doesn't block unload.
  if (opts.beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    } catch {
      // Fall through to fetch.
    }
  }

  try {
    await fetch(url, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      body,
      credentials: 'omit',   // endpoint is project-id-scoped, not session-scoped
      cache:       'no-store',
      keepalive:   true,     // sendBeacon-equivalent semantics for fetch
    });
  } catch (err) {
    // Network failure during normal operation — fine to drop.
    console.warn('[thumbnail] upload failed:', err);
  }
}

/** Install the two capture points (sign-on + sign-off) on the current
 *  page. Returns a cleanup function. */
export function installCaptureHandlers(opts: {
  cactaiBase: string;
  projectId:  string;
  kind:       'preview' | 'production';
}): () => void {
  // Sign-on capture. Defer past first paint so the DOM has settled and
  // any lazy-loaded UI (DevShell mounts, font swaps, etc.) is visible.
  // 1.5s is enough for most React mounts without being noticeable.
  const onMountTimer = setTimeout(() => {
    if (document.visibilityState === 'visible') {
      void captureAndUpload({ ...opts, beacon: false });
    }
  }, 1500);

  // Sign-off capture — covers tab close, navigation away, and the
  // "user clicked sign out and the page is about to redirect" case.
  // sendBeacon is the only reliable transport during pagehide.
  const onPageHide = () => {
    void captureAndUpload({ ...opts, beacon: true });
  };
  window.addEventListener('pagehide', onPageHide);

  return () => {
    clearTimeout(onMountTimer);
    window.removeEventListener('pagehide', onPageHide);
  };
}
