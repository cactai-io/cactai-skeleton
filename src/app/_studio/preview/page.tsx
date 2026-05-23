// src/app/_studio/preview/page.tsx
//
// Theme Inspector live-preview surface.
//
// Renders a representative sample of the developer's app, styled entirely
// through CSS custom properties from the dev's theme.ts. The Theme Inspector
// (rendered in the DevShell on the Cactai platform domain) loads this page
// in an iframe and broadcasts `cactai:theme-delta` postMessages on every
// control change. We listen, translate the dotted token path to the matching
// CSS variable, and update the document element so the preview reflects the
// dev's unsaved state.
//
// Gating:
//   - Returns 404 in production unless STUDIO_PREVIEW_ENABLED=true.
//   - Same-origin sandboxing on the iframe is the Inspector's responsibility
//     (sandbox="allow-scripts allow-same-origin"). This page is otherwise
//     publicly addressable when the env var is on — there's no auth here
//     because the page renders no sensitive data, only token-driven styling.
//
// Token name translation:
//   The Inspector posts dotted paths like "color.primary" or "shadows.md".
//   The skeleton's CSS variables follow the convention defined in
//   src/lib/tokens.ts: `name.with.dots` → `--name-with-dots`. This page does
//   the same translation client-side without touching tokens.ts.
//
// Acceptance scope:
//   We accept messages whose `type === 'cactai:theme-delta'` from any origin
//   because the iframe is loaded cross-origin from the DevShell (the
//   developer's preview Vercel deploy ≠ Cactai platform domain). Origin
//   restriction here would break the legitimate flow. The Inspector is the
//   trust boundary; this page is a render-only consumer.

import { notFound } from 'next/navigation';
import { StudioPreviewClient } from './client';

export const dynamic = 'force-dynamic';

export default function StudioPreviewPage() {
  if (process.env.STUDIO_PREVIEW_ENABLED !== 'true') return notFound();
  return <StudioPreviewClient />;
}
