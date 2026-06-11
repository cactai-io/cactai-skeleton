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
// Same-origin sandboxing on the iframe is the Inspector's responsibility
// (sandbox="allow-scripts allow-same-origin"). This page is publicly
// addressable but renders no sensitive data — only token-driven CSS variable
// swaps from the developer's theme.
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

import { StudioPreviewClient } from './client';

export const dynamic = 'force-dynamic';

export default function StudioPreviewPage() {
  return <StudioPreviewClient />;
}
