// src/app/devshell/providers/page.tsx
//
// v1.3.5 2026-05-29 — DevShell provider routing UI (dev role only).
//
// Lives in /devshell/* — a separate top-level route from /operate/*
// because DevShell preferences serve the developer's own dev-time
// agent, not the deployed app's runtime. Storage shape:
// project_state.decisions.capability_config_v2.devshell.priority_by_category.
//
// UI model: per-category ordered priority list. Position 0 is primary;
// subsequent positions are fallbacks in order. Developer picks ↑↓ arrows
// to reorder. When the developer wants a specific provider for a
// specific dev-time call, they pass `provider` in the tool call
// directly — the priority list answers "no preference, what's the
// default?" which is the common case in non-repetitive dev work.
//
// Different from /operate/providers/ (app-runtime config), which uses
// per-tool dropdown selection — apps are repetitive, so explicit
// per-tool pinning matters there more than fallback chains.

import { requireDevRole } from '@/lib/auth';
import { DevShellProvidersClient } from './DevShellProviders.client';
import type { JSX } from 'react';

export default async function DevShellProvidersPage(): Promise<JSX.Element> {
  await requireDevRole();
  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        DevShell provider routing
      </h1>
      <p style={{ color: 'var(--c-text-2)', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
        Sets the default provider priority for the DevShell agent when no provider
        is explicitly specified in a tool call. Position 1 is primary; positions 2+
        are fallbacks in order. For a specific dev-time call, pass a{' '}
        <code style={{ fontSize: 12 }}>provider</code> field in the tool input to
        override this default.
      </p>
      <DevShellProvidersClient />
    </div>
  );
}
