// src/lib/lens-tab.ts
// Client-side per-tab lens handling. Implements the multi-tab scenario:
// each tab can carry its own active lens, independent of the user's JWT
// claim. The lens is persisted in window.name so it survives navigation
// within the tab and is naturally lost when the tab closes.
//
// Origination:
//   When the avatar menu opens a lens tab (e.g. clicks "Admin lens"), it
//   calls window.open(`/app?lens=admin`, 'cactai-lens-admin'). The named
//   window pattern means re-clicking the same lens focuses the existing
//   tab rather than spawning another. The new tab's URL carries ?lens=admin
//   which we read on load and persist into window.name.
//
// Server propagation:
//   Every fetch from this tab to a same-origin route includes the lens via
//   an X-Cactai-Lens header. Middleware validates the header against the
//   user's actual tenant_members rows and applies the lens as a request-
//   scoped override of the JWT claim.
//
// End-user behavior:
//   End users never go through avatar menus and never see ?lens=. Their
//   tab's window.name stays empty, no X-Cactai-Lens header is sent, and
//   the JWT claim is the source of truth. Production semantics are
//   unchanged.

const TAB_LENS_NAME_PREFIX = 'cactai-lens-';

export type LensValue = string; // post role-catalog data-driven

/**
 * Determine the lens active for this tab. Resolution order:
 *   1. ?lens= query param (set by avatar-menu open). Persists into
 *      window.name on first read so refreshes preserve the lens.
 *   2. window.name with the 'cactai-lens-' prefix (set on a prior load).
 *   3. null — no per-tab override; server falls back to JWT claim.
 */
export function getTabLens(): LensValue | null {
  if (typeof window === 'undefined') return null;

  // 1. URL takes priority on first paint.
  try {
    const url   = new URL(window.location.href);
    const fromQ = url.searchParams.get('lens');
    if (fromQ) {
      window.name = `${TAB_LENS_NAME_PREFIX}${fromQ}`;
      return fromQ;
    }
  } catch {
    /* SSR-safe noop */
  }

  // 2. Persisted in window.name.
  if (window.name?.startsWith(TAB_LENS_NAME_PREFIX)) {
    return window.name.slice(TAB_LENS_NAME_PREFIX.length);
  }

  return null;
}

/**
 * Wrap fetch to include the X-Cactai-Lens header automatically. Use this
 * for all skeleton API calls from any tab that may carry a lens override.
 */
export function lensFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const lens = getTabLens();
  if (!lens) return fetch(input, init);

  const headers = new Headers(init.headers);
  headers.set('X-Cactai-Lens', lens);
  return fetch(input, { ...init, headers });
}

/**
 * Convenience for the avatar-menu click handler: open a named tab carrying
 * a specific lens. If a tab with that name already exists, the browser
 * focuses it instead of creating a new one.
 */
export function openLensTab(lens: LensValue, basePath: string = '/app'): void {
  if (typeof window === 'undefined') return;
  const url = `${basePath}?lens=${encodeURIComponent(lens)}`;
  window.open(url, `${TAB_LENS_NAME_PREFIX}${lens}`);
}

/**
 * Convenience: open the dev surface in a named tab. Used from operator-panel
 * avatar menu's "Open DevShell" item — landing the developer in a single
 * persistent dev tab no matter how many times they click.
 *
 * The view parameter selects Dev or Plan as the initial pane.
 */
export function openDevTab(view: 'dev' | 'plan' = 'dev'): void {
  if (typeof window === 'undefined') return;
  const name = view === 'plan' ? 'cactai-plan' : 'cactai-dev';
  window.open(`/dev?view=${view}`, name);
}
