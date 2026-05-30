// packages/devshell/src/index.ts
// Public API of @cactai-io/devshell. Dynamically imported by the skeleton's
// /dev/page.tsx stub on preview/dev environments. Never imported in
// production builds (the stub gates the import on VERCEL_ENV).
//
// What this package exposes:
//   - DevShellProvider — opens the platform session and renders the
//     primitive tree the platform sends back (the skeleton-glue wrapper).
//   - DevShellPage     — thin wrapper around DevShellProvider used by the
//     skeleton's /dev/page.tsx stub.
//   - ProviderKeyModal — mid-turn capability-key prompt.
//   - DevShell (re-export from @cactai-io/mui) — the full IDE chrome with
//     top-bar pills (Dev/Plan view switcher, "Preview as" role pills),
//     avatar menu, rail panels, and editor. Re-exported so the skeleton
//     and any downstream consumer depend only on @cactai-io/devshell rather
//     than reaching into @cactai-io/mui directly.
export { DevShellProvider } from './DevShellProvider.js';
export { DevShellPage } from './DevShellPage.js';
export { ProviderKeyModal } from './ProviderKeyModal.js';
// Phase 1 — self-driven wrapper around mui's rich DevShell. Customer apps
// mount this with auth + identity only; it handles MUIShell construction
// and supplies empty defaults for the panel data props. Phase 2 swaps
// each default for a real fetcher (CactaiClient through /api/cactai).
export { SelfDrivenDevShell } from './SelfDrivenDevShell.js';
// Re-exports from @cactai-io/mui — the IDE chrome travels with this package
// so consumers don't need to know about @cactai-io/mui directly.
export { DevShell, injectDevShellStyles, DEVSHELL_CSS } from '@cactai-io/mui';
