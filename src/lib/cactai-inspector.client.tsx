// src/lib/cactai-inspector.client.tsx
// Iframe-side inspector bridge for the DevShell click-to-select feature
// (v1.3 Phase 13, Gap 132 + Gap 134 iframe half). Runs inside the
// developer's app when rendered as the DevShell live preview iframe.
//
// Lifecycle:
//   1. Mount → post `cactai-inspect:ready` to parent so DevShell knows
//      the iframe is instrumentable.
//   2. Listen for `cactai-inspect:enable` from parent → attach pointer
//      + click handlers (capture phase, document level).
//   3. On pointermove → find element under pointer + nearest ancestor
//      with data-source-location, post `cactai-inspect:hover` with the
//      location (or null to clear the highlight).
//   4. On click → post `cactai-inspect:select` with the resolved
//      location, AND swallow the click so the underlying app doesn't
//      receive it.
//   5. On `cactai-inspect:disable` → detach handlers; clicks reach the
//      app normally again.
//
// Dev-only: the root layout renders this conditionally on NODE_ENV.
// Production bundles don't ship the inspector code at all.

'use client';

import { useEffect } from 'react';

interface InspectorPayload {
  filename:       string;
  line:           number;
  column:         number;
  element_tag:    string;
  element_text?:  string;
  element_attrs?: Record<string, string>;
  via_ancestor?:  boolean;
  component_file?: string;
}

interface NoMatchPayload {
  reason:         'no_source_location' | 'third_party';
  element_tag?:   string;
  element_text?:  string;
}

/** Mount this once at the root of the skeleton's app shell in
 *  development. It posts `cactai-inspect:ready` on mount and listens
 *  for enable/disable messages from the DevShell parent. */
export function CactaiInspectorBridge(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.parent === window) return;  // not in an iframe — no-op

    let enabled = false;
    let lastHover: InspectorPayload | null = null;

    const postToParent = (msg: unknown): void => {
      // Don't restrict the target origin here — the parent does its
      // own origin check on receipt. Restricting target origin would
      // require the iframe to know the parent's origin a priori,
      // which it doesn't.
      window.parent.postMessage(msg, '*');
    };

    const resolveSourceLocation = (element: Element | null): { payload: InspectorPayload; viaAncestor: boolean } | { noMatch: NoMatchPayload } => {
      let target = element;
      let via    = false;
      while (target && target !== document.documentElement) {
        const value = (target as HTMLElement).getAttribute?.('data-source-location');
        if (value) {
          // Parse `path:line:column`. Be defensive about Windows paths
          // containing colons — split from the right.
          const lastColon = value.lastIndexOf(':');
          const penult    = value.lastIndexOf(':', lastColon - 1);
          if (lastColon === -1 || penult === -1) {
            target = target.parentElement;
            via = true;
            continue;
          }
          const filename = value.slice(0, penult);
          const line     = parseInt(value.slice(penult + 1, lastColon), 10);
          const column   = parseInt(value.slice(lastColon + 1), 10);
          if (Number.isNaN(line) || Number.isNaN(column)) {
            target = target.parentElement;
            via = true;
            continue;
          }
          const el = target as HTMLElement;
          const text = (el.textContent ?? '').trim().slice(0, 80);
          const attrs: Record<string, string> = {};
          for (const name of ['id', 'role', 'aria-label', 'data-testid']) {
            const v = el.getAttribute(name);
            if (v) attrs[name] = v;
          }
          if (el.className && typeof el.className === 'string') attrs['className'] = el.className.slice(0, 200);
          return {
            payload: {
              filename, line, column,
              element_tag:    el.tagName.toLowerCase(),
              element_text:   text || undefined,
              element_attrs:  Object.keys(attrs).length > 0 ? attrs : undefined,
              via_ancestor:   via || undefined,
              component_file: filename,
            },
            viaAncestor: via,
          };
        }
        target = target.parentElement;
        via = true;
      }
      // No source-location anywhere up the tree.
      const original = element as HTMLElement | null;
      return {
        noMatch: {
          reason:       'no_source_location',
          element_tag:  original?.tagName?.toLowerCase(),
          element_text: original?.textContent?.trim().slice(0, 80) ?? undefined,
        },
      };
    };

    const handlePointerMove = (ev: PointerEvent): void => {
      if (!enabled) return;
      const result = resolveSourceLocation(ev.target as Element | null);
      if ('payload' in result) {
        const next = result.payload;
        // Avoid spamming the parent with identical hover events.
        if (lastHover
         && lastHover.filename === next.filename
         && lastHover.line === next.line
         && lastHover.column === next.column) return;
        lastHover = next;
        postToParent({ type: 'cactai-inspect:hover', payload: next });
      } else {
        if (lastHover === null) return;
        lastHover = null;
        postToParent({ type: 'cactai-inspect:hover', payload: null });
      }
    };

    const handleClick = (ev: MouseEvent): void => {
      if (!enabled) return;
      // Swallow the click so the underlying app doesn't react.
      ev.preventDefault();
      ev.stopPropagation();
      const result = resolveSourceLocation(ev.target as Element | null);
      if ('payload' in result) {
        postToParent({ type: 'cactai-inspect:select', payload: result.payload });
      } else {
        postToParent({ type: 'cactai-inspect:no-match', payload: result.noMatch });
      }
    };

    const handleParentMessage = (ev: MessageEvent): void => {
      if (!ev.data || typeof ev.data !== 'object' || !('type' in ev.data)) return;
      const t = ev.data.type;
      if (t === 'cactai-inspect:enable') {
        if (enabled) return;
        enabled = true;
        document.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
        document.addEventListener('click',       handleClick,       { capture: true });
      } else if (t === 'cactai-inspect:disable') {
        if (!enabled) return;
        enabled  = false;
        lastHover = null;
        document.removeEventListener('pointermove', handlePointerMove, { capture: true } as EventListenerOptions);
        document.removeEventListener('click',       handleClick,       { capture: true } as EventListenerOptions);
        postToParent({ type: 'cactai-inspect:hover', payload: null });
      } else if (t === 'cactai-inspect:ping') {
        // Liveness check — parent uses this to confirm the iframe is
        // running an inspector-aware build.
        postToParent({ type: 'cactai-inspect:ready' });
      }
    };

    window.addEventListener('message', handleParentMessage);
    postToParent({ type: 'cactai-inspect:ready' });

    return () => {
      window.removeEventListener('message', handleParentMessage);
      document.removeEventListener('pointermove', handlePointerMove, { capture: true } as EventListenerOptions);
      document.removeEventListener('click',       handleClick,       { capture: true } as EventListenerOptions);
    };
  }, []);

  return null;
}
