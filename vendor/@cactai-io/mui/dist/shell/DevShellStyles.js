// packages/mui/src/shell/DevShellStyles.ts
//
// All DevShell CSS in one string. Injected once into <head> as a <style> tag.
// Every rule is scoped under [data-cactai-shell] so nothing leaks into the
// skeleton app's own styles.
//
// Token policy (Phase 4 migration):
//   - All colors come from @cactai-io/brand-tokens via CSS variables.
//   - The legacy --ds-* alias names are kept (DevShell internals reference
//     them) but each is now bound to a brand-token variable. If a designer
//     changes --c-bg or --gradient-brand-full, DevShell follows automatically.
//   - The currently-active panel's section accent is exposed via --accent /
//     --accent-solid (set by bindSection() on the rendered panel root).
//     Interactive elements read those two vars and adapt automatically.
//   - Light is the default. [data-cactai-shell] does NOT set its own
//     [data-color-scheme]; that's mirrored from the document root's
//     [data-theme] by DevShell.tsx. brand-tokens' light/dark blocks supply
//     the actual --c-* values.
//
// Class prefix: ds- (DevShell). Animation prefix: ds-anim-.
export const DS_STYLE_TAG_ID = 'cactai-devshell-styles';
export const DEVSHELL_CSS = `
[data-cactai-shell] {
  /* DevShell-local aliases bound to brand-tokens. Keep the alias names so
     existing rules below don't need rewriting; change only what they point at.
     Sunset gradient stops mirror the brand-tokens --g-stop-* values so any
     legacy rule still expecting --ds-orange resolves to the brand orange. */
  --ds-orange: var(--g-stop-1);
  --ds-pink:   var(--g-stop-2);
  --ds-red:    var(--g-stop-3);
  --ds-purple: var(--g-stop-4);

  /* Surface scale → brand-tokens. Note the slight remap: DevShell's --ds-canvas
     is the outermost shell background, which maps cleanest to --c-bg.
     --ds-surface (rails, chat panel) → --c-bg-2. --ds-surface-2 → --c-bg-3.
     --ds-elevated (cards, inputs, pills) → --c-surface-2. */
  --ds-canvas:      var(--c-bg);
  --ds-surface:     var(--c-bg-2);
  --ds-surface-2:   var(--c-bg-3);
  --ds-elevated:    var(--c-surface-2);
  --ds-border-soft: var(--c-border);
  --ds-border:      var(--c-border-med);
  --ds-btn-edge:    var(--c-border-med);

  /* Text scale */
  --ds-text:   var(--c-text);
  --ds-text-2: var(--c-text-2);
  --ds-text-3: var(--c-text-3);

  /* Gradients. --ds-grad-* default to the brand sunset when no section is
     bound; inside a bindSection() subtree, --accent overrides --ds-grad-135
     and --ds-grad-solid so panel-specific gradients flow through every
     legacy rule that references them. */
  --ds-grad-135:   var(--accent, var(--gradient-brand-full));
  --ds-grad-solid: var(--accent, var(--gradient-brand-full));
  --ds-grad-v:     var(--accent, linear-gradient(180deg,
    var(--g-stop-1) 0%, var(--g-stop-2) 35%,
    var(--g-stop-3) 65%, var(--g-stop-4) 100%));

  /* Glow — derived from the active section's solid accent. Falls back to
     the brand accent if no section is bound. */
  --ds-glow:       0 0 6px color-mix(in srgb, var(--accent-solid, var(--c-accent)) 40%, transparent);
  --ds-glow-hover: 0 0 12px color-mix(in srgb, var(--accent-solid, var(--c-accent)) 50%, transparent),
                   var(--elev-2);

  /* Radius — DevShell scale anchored to brand tokens. */
  --ds-r-sm:   var(--r-sm);
  --ds-r-md:   var(--r);
  --ds-r-lg:   var(--r-lg);
  --ds-r-pill: 999px;

  /* Layout */
  --ds-rail-w:   60px;
  --ds-header-h: 52px;
  --ds-chat-w:   340px;
  --ds-tree-h:   240px;

  /* Owl character vars — character/mark layer, not part of the brand-tokens
     surface palette. These are touched by thread B Phase 7 alongside the
     character migration; leaving as-is. */
  --owl-body:  #2A2A3D;
  --owl-chest: #1E1E2E;
  --owl-feet:  #FFB44D;
}

/* When the document toggles to light, character vars need their own values.
   Surface/text vars are handled entirely by brand-tokens' [data-theme="light"]
   selector — brand-tokens fires on any ancestor matching that selector, so
   setting data-theme on [data-cactai-shell] is sufficient to flip the
   surface palette without coordinating with the host document. */
[data-cactai-shell][data-theme="light"] {
  --owl-body:  #C8C8D8;
  --owl-chest: #D8D8E4;
}

/* Body lock — applied by the DevShell on mount via a body class so it
   only kicks in while /dev is rendered (other routes need normal
   scroll). Combination needed because no single property covers
   every overflow path:
     - overflow: hidden on html + body kills the actual scroll
     - overscroll-behavior: none kills macOS/Chrome trackpad
       rubber-band that exposes the white body background even when
       there's nothing to scroll
     - height: 100% + width: 100% prevents document height drift
       (any tall child of [data-cactai-shell] would otherwise grow
       the body past 100vh)
     - position: fixed on body as a final belt-and-suspenders for
       iOS Safari where overflow: hidden alone isn't enough */
html:has(body.cactai-shell-body-lock),
body.cactai-shell-body-lock {
  overflow:            hidden !important;
  overscroll-behavior: none;
  height:              100%;
  width:               100%;
}
body.cactai-shell-body-lock {
  position:            fixed;
  inset:               0;
}

/* Reset inside shell */
[data-cactai-shell] *, [data-cactai-shell] *::before, [data-cactai-shell] *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

[data-cactai-shell] {
  display: grid;
  grid-template-rows: var(--ds-header-h) 1fr;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--ds-canvas);
  color: var(--ds-text);
  font-family: var(--f-ui);
  font-size: 14px;
  line-height: 1.55;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar */
[data-cactai-shell] ::-webkit-scrollbar { width: 6px; height: 6px; }
[data-cactai-shell] ::-webkit-scrollbar-track { background: transparent; }
[data-cactai-shell] ::-webkit-scrollbar-thumb { background: var(--ds-border); border-radius: 3px; }
[data-cactai-shell] ::-webkit-scrollbar-thumb:hover { background: var(--ds-text-3); }

/* Mono font utility */
[data-cactai-shell] .ds-mono {
  font-family: var(--f-mono);
}

/* Gradient text utility */
[data-cactai-shell] .ds-grad-text {
  background: var(--ds-grad-solid);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Eyebrow / label treatment — display face, all caps */
[data-cactai-shell] .ds-eyebrow {
  font-family: var(--f-display);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--ds-text-3);
}

/* When a host app's content is rendered inside DevShell as a preview, its
   typography (and other cascading font properties) should NOT inherit
   DevShell chrome. Resetting font-family to inherit lets the developer's
   own theme fonts take over. font-size and font-weight reset back to their
   initial values for the same reason. */
[data-cactai-shell] [data-appshell-preview] {
  font-family: inherit;
  font-size: medium;
  font-weight: normal;
  letter-spacing: normal;
  line-height: normal;
}

/* ── TOP BAR ─────────────────────────────────────────────────────────── */
[data-cactai-shell] .ds-topbar {
  grid-row: 1;
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 12px;
  background: var(--ds-surface);
  border-bottom: 1px solid var(--ds-border-soft);
  flex-shrink: 0;
}

[data-cactai-shell] .ds-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--f-display);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: var(--ds-text);
  user-select: none;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-brand-mark {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
}

[data-cactai-shell] .ds-project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 14px;
  border-left: 1px solid var(--ds-border-soft);
  color: var(--ds-text-2);
  font-size: 12.5px;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-project-name { color: var(--ds-text); font-weight: 500; }
[data-cactai-shell] .ds-branch-pill {
  font-family: var(--f-mono);
  font-size: 11px;
  background: var(--ds-elevated);
  padding: 2px 8px;
  border-radius: var(--ds-r-sm);
  color: var(--ds-text-2);
}

/* View switcher in top bar — v1.1: Dev | Plan only. Role pills moved out
   of the top bar entirely; they live in the avatar menu's "Preview as"
   section and on the dedicated "Preview as…" control to the right of
   the spacer. The Dev/Plan group keeps the gradient-on-active treatment
   because those are themselves section selectors. */
[data-cactai-shell] .ds-view-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
}
[data-cactai-shell] .ds-view-dev-group {
  display: flex;
  gap: 4px;
}

/* View buttons — Dev/Plan group (gradient when active). Hover uses the
   universal interactive pattern: lift, accent border, accent glow. */
[data-cactai-shell] .ds-view-btn {
  padding: 5px 13px;
  border-radius: var(--ds-r-pill);
  font-family: var(--f-ui);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ds-text-2);
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  letter-spacing: -0.005em;
  transition: transform var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease),
              box-shadow var(--d-base) var(--ease),
              color var(--d-base) var(--ease);
  white-space: nowrap;
}
[data-cactai-shell] .ds-view-btn:hover:not(.ds-view-active):not(:disabled),
[data-cactai-shell] .ds-view-btn:focus-visible:not(.ds-view-active):not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  color: var(--ds-text);
  outline: none;
}
[data-cactai-shell] .ds-view-btn:active:not(:disabled) { transform: translateY(0); }
[data-cactai-shell] .ds-view-btn:disabled { opacity: 0.4; cursor: not-allowed; }
[data-cactai-shell] .ds-view-active {
  background: var(--ds-grad-135);
  backdrop-filter: blur(4px) saturate(140%);
  -webkit-backdrop-filter: blur(4px) saturate(140%);
  color: white;
  font-weight: 600;
  border: 1px solid var(--ds-btn-edge);
  box-shadow: var(--ds-glow);
}

[data-cactai-shell] .ds-topbar-spacer { flex: 1; }

/* Preview as… picker — v1.1. Visually distinct from the Dev | Plan
   switcher to keep developer-mode toggles separate from end-user role
   simulations. Renders next to the avatar menu, on the right side of
   the top bar. Hidden entirely when the project defines no roles. */
[data-cactai-shell] .ds-preview-as {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-preview-as-label {
  font-family: var(--f-display);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ds-text-3);
  user-select: none;
}
[data-cactai-shell] .ds-preview-as-group {
  display: inline-flex;
  background: var(--ds-elevated);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-pill);
  padding: 2px;
  gap: 2px;
}
[data-cactai-shell] .ds-preview-as-btn {
  padding: 4px 11px;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  background: transparent;
  color: var(--ds-text-2);
  border: 1px solid transparent;
  border-radius: var(--ds-r-pill);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--d-base) var(--ease),
              background var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-preview-as-btn:hover,
[data-cactai-shell] .ds-preview-as-btn:focus-visible {
  color: var(--ds-text);
  outline: none;
}
[data-cactai-shell] .ds-preview-as-active {
  background: var(--ds-surface-2);
  color: var(--ds-text);
  border-color: var(--accent-solid, var(--c-border-med));
}

/* Avatar in top bar — v1.1 moved the avatar out of the rail and into the
   top bar. In v1.1.7 cleanup the avatar moved again to the rightmost
   position, second from the right being the commit button. */
[data-cactai-shell] .ds-avatar-wrap { position: relative; flex-shrink: 0; }
[data-cactai-shell] .ds-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--ds-grad-135);
  backdrop-filter: blur(6px) saturate(140%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  letter-spacing: 0.02em;
  border: 1px solid var(--ds-btn-edge);
  box-shadow: var(--ds-glow);
  transition: transform var(--d-fast) var(--ease),
              box-shadow var(--d-fast) var(--ease);
}
[data-cactai-shell] .ds-avatar:hover,
[data-cactai-shell] .ds-avatar:focus-visible {
  transform: translateY(-1px);
  box-shadow: var(--ds-glow-hover);
  outline: none;
}

/* Primary button — gradient filled. */
[data-cactai-shell] .ds-btn-primary {
  background: var(--ds-grad-135);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  color: white;
  border: 1px solid var(--ds-btn-edge);
  padding: 7px 16px;
  border-radius: var(--ds-r-md);
  font-family: var(--f-ui);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--ds-glow);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  letter-spacing: -0.005em;
  transition: transform var(--d-fast) var(--ease),
              box-shadow var(--d-fast) var(--ease),
              filter var(--d-fast) var(--ease);
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  white-space: nowrap;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-btn-primary:hover:not(:disabled),
[data-cactai-shell] .ds-btn-primary:focus-visible:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--ds-glow-hover);
  outline: none;
}
[data-cactai-shell] .ds-btn-primary:active:not(:disabled) {
  transform: translateY(0);
  filter: brightness(1.18);
  box-shadow: var(--ds-glow);
}
[data-cactai-shell] .ds-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

/* Ghost button — universal interactive pattern. */
[data-cactai-shell] .ds-btn-ghost {
  background: transparent;
  border: 1px solid var(--ds-border);
  color: var(--ds-text-2);
  padding: 7px 14px;
  border-radius: var(--ds-r-md);
  font-family: var(--f-ui);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: transform var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease),
              box-shadow var(--d-base) var(--ease),
              color var(--d-base) var(--ease);
  white-space: nowrap;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-btn-ghost:hover:not(:disabled),
[data-cactai-shell] .ds-btn-ghost:focus-visible:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  color: var(--ds-text);
  outline: none;
}
[data-cactai-shell] .ds-btn-ghost:active:not(:disabled) { transform: translateY(0); }
[data-cactai-shell] .ds-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── BODY: RAIL + MAIN ───────────────────────────────────────────────── */
[data-cactai-shell] .ds-body {
  grid-row: 2;
  display: flex;
  overflow: hidden;
}

/* Left rail */
[data-cactai-shell] .ds-rail {
  width: var(--ds-rail-w);
  flex: 0 0 var(--ds-rail-w);
  background: var(--ds-surface);
  border-right: 1px solid var(--ds-border-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
}

/* Rail buttons — universal interactive pattern, with rail-specific active
   indicator (the left-edge gradient bar at ::before). */
[data-cactai-shell] .ds-rail-btn {
  width: 42px; height: 42px;
  border-radius: var(--ds-r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--ds-text-3);
  position: relative;
  transition: transform var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease),
              box-shadow var(--d-base) var(--ease),
              color var(--d-base) var(--ease),
              background var(--d-base) var(--ease);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-rail-btn:hover:not(.ds-rail-active):not(:disabled),
[data-cactai-shell] .ds-rail-btn:focus-visible:not(.ds-rail-active):not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  color: var(--ds-text);
  outline: none;
}
[data-cactai-shell] .ds-rail-btn:hover:not(.ds-rail-active) svg,
[data-cactai-shell] .ds-rail-btn:focus-visible:not(.ds-rail-active) svg { stroke: url(#ds-sunset); }
[data-cactai-shell] .ds-rail-btn:active:not(:disabled) { transform: translateY(0); }
[data-cactai-shell] .ds-rail-active svg { stroke: url(#ds-sunset); }
[data-cactai-shell] .ds-rail-active {
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  background: var(--ds-surface-2);
}
[data-cactai-shell] .ds-rail-active::before {
  content: '';
  position: absolute;
  left: -14px; top: 10px; bottom: 10px; width: 3px;
  background: var(--ds-grad-v);
  border-radius: 0 2px 2px 0;
}

/* Chat toggle — attention dot */
[data-cactai-shell] .ds-rail-chat-btn {
  width: 42px; height: 42px;
  border-radius: var(--ds-r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--ds-text-3);
  position: relative;
  transition: background var(--d-base) var(--ease),
              color var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease),
              box-shadow var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-rail-chat-btn:hover,
[data-cactai-shell] .ds-rail-chat-btn:focus-visible {
  background: var(--ds-elevated);
  color: var(--ds-text);
  border-color: var(--accent-solid, var(--c-accent));
  outline: none;
}
[data-cactai-shell] .ds-rail-chat-btn.ds-has-unread::after {
  content: '';
  position: absolute;
  top: 8px; right: 8px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--ds-grad-solid);
  box-shadow: 0 0 6px color-mix(in srgb, var(--accent-solid, var(--c-accent)) 60%, transparent);
}

[data-cactai-shell] .ds-rail-spacer { flex: 1; }

/* ── MAIN AREA ───────────────────────────────────────────────────────── */
[data-cactai-shell] .ds-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── CHAT PANEL ──────────────────────────────────────────────────────── */
[data-cactai-shell] .ds-chat {
  flex: 0 0 auto;
  background: var(--ds-surface);
  border-right: 1px solid var(--ds-border-soft);
  display: grid;
  grid-template-rows: var(--ds-header-h) 1fr auto;
  overflow: hidden;
  min-width: 260px;
  max-width: 560px;
}

[data-cactai-shell] .ds-chat-header {
  height: var(--ds-header-h);
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 10px;
  border-bottom: 1px solid var(--ds-border-soft);
  flex-shrink: 0;
}

/* Character animation area */
[data-cactai-shell] .ds-char-wrap {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-cactai-shell] .ds-char-fallback {
  border-radius: 50%;
  background: var(--ds-grad-solid);
  opacity: 0.8;
  animation: ds-char-fallback-pulse 2.4s ease-in-out infinite;
}
@keyframes ds-char-fallback-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50%       { opacity: 1;   transform: scale(1.1); }
}

[data-cactai-shell] .ds-agent-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}
[data-cactai-shell] .ds-agent-name {
  font-family: var(--f-ui);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ds-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
[data-cactai-shell] .ds-agent-state-text {
  font-family: var(--f-display);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ds-text-3);
  font-weight: 500;
}

[data-cactai-shell] .ds-chat-collapse {
  margin-left: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--ds-text-3);
  font-size: 14px;
  padding: 4px 2px;
  flex-shrink: 0;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-chat-collapse:hover,
[data-cactai-shell] .ds-chat-collapse:focus-visible {
  color: var(--ds-text);
  outline: none;
}

/* Chat body — document style, no bubbles. Conversation surface uses
   --f-chat per the spec's font assignments. */
[data-cactai-shell] .ds-chat-body {
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: var(--f-chat);
}

/* Inspector context banner in chat */
[data-cactai-shell] .ds-inspector-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--ds-elevated);
  border-bottom: 1px solid var(--ds-border);
  font-family: var(--f-ui);
  font-size: 11.5px;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-inspector-banner-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ds-grad-solid);
  box-shadow: 0 0 5px color-mix(in srgb, var(--accent-solid, var(--c-accent)) 50%, transparent);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-inspector-banner-label {
  font-family: var(--f-mono);
  font-size: 11px;
  color: var(--ds-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-cactai-shell] .ds-inspector-banner-clear {
  background: transparent; border: none;
  cursor: pointer; color: var(--ds-text-3);
  font-size: 13px; padding: 0 2px;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-inspector-banner-clear:hover,
[data-cactai-shell] .ds-inspector-banner-clear:focus-visible {
  color: var(--ds-text);
  outline: none;
}

/* Chat messages — document style. Author label is a display-face caps
   eyebrow; body text inherits --f-chat from .ds-chat-body. */
[data-cactai-shell] .ds-msg {
  padding: 10px 16px;
  position: relative;
}
[data-cactai-shell] .ds-msg-author {
  font-family: var(--f-display);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--ds-text-3);
  margin-bottom: 4px;
}
/* Agent author label — gradient */
[data-cactai-shell] .ds-msg.ds-msg-agent .ds-msg-author {
  background: var(--ds-grad-solid);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
/* User message — left accent line, slightly dimmed body */
[data-cactai-shell] .ds-msg.ds-msg-user {
  border-left: 2px solid var(--ds-border);
  padding-left: 14px;
}
[data-cactai-shell] .ds-msg.ds-msg-user .ds-msg-author { color: var(--ds-text-3); }
[data-cactai-shell] .ds-msg.ds-msg-user .ds-msg-body { color: var(--ds-text-2); }

[data-cactai-shell] .ds-msg-body {
  font-size: 13.5px;
  color: var(--ds-text);
  line-height: 1.65;
}

/* Classification chip — shown beneath agent response when relevant */
[data-cactai-shell] .ds-msg-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-family: var(--f-ui);
  font-size: 10px;
  color: var(--ds-text-3);
  background: var(--ds-elevated);
  padding: 2px 8px;
  border-radius: var(--ds-r-pill);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
[data-cactai-shell] .ds-msg-chip.ds-chip-backlog {
  color: var(--accent-solid, var(--g-stop-1));
  background: color-mix(in srgb, var(--accent-solid, var(--g-stop-1)) 8%, transparent);
}

/* Chat input area — input contents in mono per spec. */
[data-cactai-shell] .ds-chat-input-area {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--ds-border-soft);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-chat-input-shell {
  background: var(--ds-elevated);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-md);
  padding: 10px 12px 8px;
  transition: border-color var(--d-base) var(--ease),
              box-shadow var(--d-base) var(--ease);
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 6px;
  min-height: 72px;
}
[data-cactai-shell] .ds-chat-input-shell:focus-within {
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid, var(--c-accent)) 10%, transparent);
}
[data-cactai-shell] .ds-chat-textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--ds-text);
  font-family: var(--f-mono);
  font-size: 13.5px;
  line-height: 1.5;
  resize: none;
  outline: none;
  min-height: 20px;
  max-height: 180px;
  padding: 0;
}
[data-cactai-shell] .ds-chat-textarea::placeholder {
  color: var(--ds-text-3);
  font-family: var(--f-mono);
}

[data-cactai-shell] .ds-chat-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
[data-cactai-shell] .ds-attach-btn {
  width: 26px; height: 26px;
  border-radius: var(--ds-r-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--ds-text-3);
  cursor: pointer;
  font-size: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--d-base) var(--ease),
              background var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-attach-btn:hover,
[data-cactai-shell] .ds-attach-btn:focus-visible {
  color: var(--ds-text);
  background: var(--ds-surface-2);
  border-color: var(--accent-solid, var(--c-accent));
  outline: none;
}

[data-cactai-shell] .ds-input-meta { display: flex; align-items: center; gap: 8px; }
[data-cactai-shell] .ds-input-hint {
  font-family: var(--f-ui);
  font-size: 10px;
  color: var(--ds-text-3);
  letter-spacing: 0.04em;
}

[data-cactai-shell] .ds-send-btn {
  width: 26px; height: 26px;
  border-radius: var(--ds-r-sm);
  border: 1px solid var(--ds-btn-edge);
  background: var(--ds-grad-135);
  backdrop-filter: blur(6px);
  color: white;
  cursor: pointer;
  font-size: 13px;
  box-shadow: var(--ds-glow);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--d-fast) var(--ease),
              box-shadow var(--d-fast) var(--ease);
}
[data-cactai-shell] .ds-send-btn:hover,
[data-cactai-shell] .ds-send-btn:focus-visible {
  transform: translateY(-1px);
  box-shadow: var(--ds-glow-hover);
  outline: none;
}
[data-cactai-shell] .ds-send-btn:active { transform: translateY(0); filter: brightness(1.18); }
[data-cactai-shell] .ds-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* File attachment pills */
[data-cactai-shell] .ds-attach-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 12px 8px;
}
[data-cactai-shell] .ds-attach-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--ds-elevated);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-pill);
  padding: 3px 8px 3px 10px;
  font-family: var(--f-ui);
  font-size: 11px;
  color: var(--ds-text-2);
}
[data-cactai-shell] .ds-attach-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--ds-text-3);
  font-size: 11px;
  padding: 0;
  line-height: 1;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-attach-remove:hover,
[data-cactai-shell] .ds-attach-remove:focus-visible {
  color: var(--accent-solid, var(--c-accent));
  outline: none;
}

/* ── RESIZE HANDLES ──────────────────────────────────────────────────── */
[data-cactai-shell] .ds-resize-h {
  width: 5px; flex: 0 0 5px;
  background: transparent;
  cursor: col-resize;
  position: relative; z-index: 1;
  transition: background var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-resize-h:hover { background: var(--ds-border); }

[data-cactai-shell] .ds-resize-v {
  height: 5px; flex: 0 0 5px;
  background: transparent;
  cursor: row-resize;
  position: relative; z-index: 1;
  transition: background var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-resize-v:hover { background: var(--ds-border); }

/* ── RIGHT AREA ──────────────────────────────────────────────────────── */
[data-cactai-shell] .ds-right-area {
  flex: 1;
  /* Same min-height: 0 pattern as .ds-content + .ds-panel — required
     for the flex-column scroll chain to actually clamp at the
     viewport height. */
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

[data-cactai-shell] .ds-content {
  flex: 1;
  /* min-height: 0 is REQUIRED so a flex-column child (.ds-panel) can
     trigger its own internal scrollbar instead of expanding past the
     parent's bounds. overflow:hidden alone is necessary but not
     sufficient in some browsers/contexts. */
  min-height: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Preview window — wraps host app preview in a Mac-style chrome.
   Inside .ds-preview-content, [data-appshell-preview] resets fonts so the
   host app's own theme governs typography there. */
[data-cactai-shell] .ds-preview-wrap {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
[data-cactai-shell] .ds-preview-window {
  background: var(--ds-elevated);
  border-radius: var(--ds-r-lg);
  overflow: hidden;
  position: relative;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-solid, var(--g-stop-1)) 6%, transparent),
              var(--elev-3);
  height: 100%;
  display: flex;
  flex-direction: column;
}
[data-cactai-shell] .ds-preview-window::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--ds-r-lg);
  background:
    radial-gradient(ellipse at top right, color-mix(in srgb, var(--g-stop-1) 7%, transparent), transparent 50%),
    radial-gradient(ellipse at bottom left, color-mix(in srgb, var(--g-stop-4) 7%, transparent), transparent 50%);
  pointer-events: none;
}
[data-cactai-shell] .ds-preview-chrome {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid var(--ds-border-soft);
  gap: 6px;
  position: relative; z-index: 1;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-traffic { display: flex; gap: 6px; }
[data-cactai-shell] .ds-traffic span {
  width: 11px; height: 11px;
  border-radius: 50%;
}
/* Mac traffic-light colors — these are a deliberate skeuomorphic reference
   to macOS window controls, not part of the brand palette. They are not
   migrated to tokens for that reason. Left as raw hex literals. */
[data-cactai-shell] .ds-traffic span:nth-child(1) { background: #FF5F57; }
[data-cactai-shell] .ds-traffic span:nth-child(2) { background: #FFBD2E; }
[data-cactai-shell] .ds-traffic span:nth-child(3) { background: #28C940; }
[data-cactai-shell] .ds-preview-url {
  margin-left: auto; margin-right: auto;
  font-family: var(--f-mono);
  font-size: 11px;
  color: var(--ds-text-3);
}
[data-cactai-shell] .ds-preview-open {
  font-family: var(--f-ui);
  color: var(--ds-text-2);
  font-size: 11px;
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-preview-open:hover,
[data-cactai-shell] .ds-preview-open:focus-visible {
  color: var(--ds-text);
  outline: none;
}

[data-cactai-shell] .ds-preview-content {
  flex: 1;
  overflow: auto;
  position: relative; z-index: 1;
}
[data-cactai-shell] .ds-preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ds-text-3);
  font-family: var(--f-ui);
  font-size: 13.5px;
  text-align: center;
  padding: 24px;
}
[data-cactai-shell] .ds-preview-link {
  color: var(--accent-solid, var(--g-stop-2));
  text-decoration: none;
  font-weight: 500;
}

/* Inspector bar — floated above preview content */
[data-cactai-shell] .ds-inspector-bar {
  position: absolute;
  bottom: 12px; left: 12px; right: 12px;
  background: color-mix(in srgb, var(--c-surface) 88%, transparent);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-md);
  padding: 8px 12px;
  font-family: var(--f-ui);
  font-size: 11.5px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 2;
}
[data-cactai-shell] .ds-inspector-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--ds-grad-solid);
  box-shadow: 0 0 6px color-mix(in srgb, var(--accent-solid, var(--c-accent)) 60%, transparent);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-inspector-target {
  font-family: var(--f-mono);
  color: var(--ds-text);
  font-size: 11px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-cactai-shell] .ds-inspector-file { color: var(--ds-text-2); }
[data-cactai-shell] .ds-inspector-hint {
  color: var(--ds-text-3);
  font-size: 10.5px;
  white-space: nowrap;
}
[data-cactai-shell] .ds-inspector-clear {
  color: var(--ds-text-3);
  cursor: pointer;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 12px;
  padding: 0 2px;
  flex-shrink: 0;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-inspector-clear:hover,
[data-cactai-shell] .ds-inspector-clear:focus-visible {
  color: var(--ds-text);
  outline: none;
}

/* ── PROJECT TREE ────────────────────────────────────────────────────── */
/* Pre-fix the tree panel was flex: 0 0 auto with a hard 80–500 px height
   clamp, so even when the parent Files panel was dragged tall the tree
   capped at 500 px and floated centered/with whitespace below. Now it
   flex: 1 + min-height: 0 fills its container's full height, sticking
   to the top-left as the developer expects. */
[data-cactai-shell] .ds-tree-panel {
  flex: 1;
  min-height: 0;
  background: var(--ds-surface);
  border-top: 1px solid var(--ds-border-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
[data-cactai-shell] .ds-tree-header {
  height: var(--ds-header-h);
  flex: 0 0 var(--ds-header-h);
  display: flex;
  align-items: center;
  padding: 0 18px;
  border-bottom: 1px solid var(--ds-border-soft);
  gap: 10px;
}
[data-cactai-shell] .ds-tree-title {
  font-family: var(--f-ui);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ds-text);
}
[data-cactai-shell] .ds-tree-spacer { flex: 1; }
[data-cactai-shell] .ds-tree-collapse-btn {
  background: transparent; border: none;
  cursor: pointer; color: var(--ds-text-3);
  font-size: 14px; padding: 4px 6px;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-tree-collapse-btn:hover,
[data-cactai-shell] .ds-tree-collapse-btn:focus-visible {
  color: var(--ds-text);
  outline: none;
}

[data-cactai-shell] .ds-tree-body {
  overflow-y: auto;
  padding: 8px 4px;
  flex: 1;
  /* min-height: 0 so flex: 1 actually resolves to a finite px inside
     the parent (.ds-tree-panel) — without it the body grows past the
     parent's bounds and the internal scrollbar never engages. */
  min-height: 0;
}

/* File tree entries — mono per spec (identifier display). Universal
   interactive pattern on hover/focus; the .ds-tree-active state gets the
   gradient ring treatment that file-tree entries have always used. */
[data-cactai-shell] .ds-tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--ds-r-sm);
  cursor: pointer;
  user-select: none;
  font-family: var(--f-mono);
  font-size: 12px;
  color: var(--ds-text-2);
  border: 1px solid transparent;
  transition: transform var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease),
              box-shadow var(--d-base) var(--ease),
              color var(--d-base) var(--ease),
              background var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-tree-item:hover:not(.ds-tree-protected):not(.ds-tree-active),
[data-cactai-shell] .ds-tree-item:focus-visible:not(.ds-tree-protected):not(.ds-tree-active) {
  transform: translateY(-1px);
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  color: var(--ds-text);
  background: var(--ds-elevated);
  outline: none;
}
[data-cactai-shell] .ds-tree-item.ds-tree-active {
  background-image: linear-gradient(var(--ds-elevated), var(--ds-elevated)), var(--ds-grad-solid);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  color: var(--ds-text);
  border-color: transparent;
  padding: 2.5px 6.5px;
}
[data-cactai-shell] .ds-tree-item.ds-tree-protected { opacity: 0.45; cursor: default; }
[data-cactai-shell] .ds-tree-item.ds-tree-protected:hover { background: transparent; }
[data-cactai-shell] .ds-tree-chev { width: 10px; flex: 0 0 10px; font-size: 9px; color: var(--ds-text-3); }
[data-cactai-shell] .ds-tree-icon { width: 14px; flex: 0 0 14px; font-size: 12px; opacity: 0.7; }
[data-cactai-shell] .ds-tree-name { flex: 1; }
[data-cactai-shell] .ds-tree-mod-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent-solid, var(--c-warm));
  box-shadow: 0 0 4px color-mix(in srgb, var(--accent-solid, var(--c-warm)) 60%, transparent);
  flex-shrink: 0; margin-left: auto;
}
[data-cactai-shell] .ds-tree-sdk-badge {
  margin-left: auto;
  font-family: var(--f-display);
  font-size: 9px;
  color: var(--ds-text-3);
  background: var(--ds-canvas);
  padding: 2px 6px;
  border-radius: var(--ds-r-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
}

[data-cactai-shell] .ds-tree-collapsed-tab {
  height: 32px;
  background: var(--ds-surface);
  border-top: 1px solid var(--ds-border-soft);
  border-bottom: none;
  border-left: none;
  border-right: none;
  width: 100%;
  cursor: pointer;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  color: var(--ds-text-2);
  letter-spacing: 0.04em;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-tree-collapsed-tab:hover,
[data-cactai-shell] .ds-tree-collapsed-tab:focus-visible {
  color: var(--ds-text);
  outline: none;
}

/* ── AVATAR MENU ─────────────────────────────────────────────────────── */
[data-cactai-shell] .ds-avatar-menu {
  position: absolute;
  /* Avatar is the rightmost top-bar element in v1.1.7; anchor the menu to
     the avatar's right edge so it opens leftward into the viewport rather
     than off the right side. */
  top: 44px; right: 0;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-md);
  box-shadow: var(--elev-3);
  min-width: 190px;
  z-index: 9999;
  padding: 4px 0;
}
[data-cactai-shell] .ds-avatar-menu-section {
  font-family: var(--f-display);
  padding: 8px 14px 4px;
  font-size: 10px;
  color: var(--ds-text-3);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
[data-cactai-shell] .ds-avatar-menu-item {
  display: flex;
  width: 100%;
  padding: 8px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--f-ui);
  font-size: 13px;
  text-align: left;
  color: var(--ds-text-2);
  text-decoration: none;
  transition: background var(--d-base) var(--ease),
              color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-avatar-menu-item:hover,
[data-cactai-shell] .ds-avatar-menu-item:focus-visible {
  background: var(--ds-elevated);
  color: var(--ds-text);
  outline: none;
}
[data-cactai-shell] .ds-avatar-menu-item-active { color: var(--ds-text); font-weight: 500; }
[data-cactai-shell] .ds-avatar-menu-divider { height: 1px; background: var(--ds-border-soft); margin: 4px 0; }
[data-cactai-shell] .ds-avatar-menu-signout { color: var(--c-danger) !important; }
[data-cactai-shell] .ds-avatar-menu-version {
  font-family: var(--f-mono);
  font-size: 10px;
  color: var(--ds-text-3);
  padding: 6px 12px 4px;
  letter-spacing: 0.02em;
}

/* Theme row inside the avatar menu — v1.1 hosts the three-state theme
   toggle here instead of in the top bar. The buttons are styled to fit
   the menu's vertical rhythm; the row sits inside the DevShell preferences
   section, above the Account settings ↗ link. Writes the shared cactai-theme
   key so Platform UI and the marketplace storefront pick up the change. */
[data-cactai-shell] .ds-avatar-theme-row {
  display: inline-flex;
  gap: 2px;
  margin: 4px 14px 8px;
  padding: 3px;
  background: var(--ds-elevated);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-pill);
}
[data-cactai-shell] .ds-avatar-theme-btn {
  padding: 4px 10px;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  background: transparent;
  color: var(--ds-text-2);
  border: 1px solid transparent;
  border-radius: var(--ds-r-pill);
  cursor: pointer;
  transition: background var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease),
              color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-avatar-theme-btn:hover,
[data-cactai-shell] .ds-avatar-theme-btn:focus-visible {
  color: var(--ds-text);
  outline: none;
}
[data-cactai-shell] .ds-avatar-theme-btn-active {
  background: var(--ds-surface-2);
  color: var(--ds-text);
  border-color: var(--accent-solid, var(--c-border-med));
}

/* Files bottom panel — v1.1: Files is no longer a rail section. It is an
   always-on collapsible bottom panel in Dev view. The panel renders below
   the main content with its own header that carries the collapse control;
   when collapsed it shrinks to a thin "Files ⌃" tab. Shares the resize
   handle (.ds-resize-v) with the previous Files-as-rail-section layout. */
[data-cactai-shell] .ds-files-panel {
  display: flex;
  flex-direction: column;
  background: var(--ds-surface);
  border-top: 1px solid var(--ds-border-soft);
  overflow: hidden;
}
[data-cactai-shell] .ds-files-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--ds-surface);
  border-bottom: 1px solid var(--ds-border-soft);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-files-panel-title {
  font-family: var(--f-display);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ds-text-2);
  font-weight: 600;
}
[data-cactai-shell] .ds-files-panel-collapse {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ds-r-sm);
  padding: 3px 8px;
  font-family: var(--f-ui);
  font-size: 11px;
  color: var(--ds-text-3);
  cursor: pointer;
  transition: color var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-files-panel-collapse:hover,
[data-cactai-shell] .ds-files-panel-collapse:focus-visible {
  color: var(--ds-text);
  border-color: var(--ds-border);
  outline: none;
}
[data-cactai-shell] .ds-files-panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
}
[data-cactai-shell] .ds-files-collapsed-tab {
  height: 28px;
  background: var(--ds-surface);
  border-top: 1px solid var(--ds-border-soft);
  border-bottom: none;
  border-left: none;
  border-right: none;
  width: 100%;
  cursor: pointer;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  color: var(--ds-text-2);
  letter-spacing: 0.04em;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-files-collapsed-tab:hover,
[data-cactai-shell] .ds-files-collapsed-tab:focus-visible {
  color: var(--ds-text);
  outline: none;
}


/* ── PANEL SHARED ────────────────────────────────────────────────────── */
/* min-height: 0 is REQUIRED for overflow-y: auto to trigger on a flex
   item — without it, flex items default to min-height: auto (content
   height) which makes the item grow past the parent's bounds and the
   parent's overflow: hidden just clips, never producing an internal
   scrollbar. This was the root cause of "this page doesn't scroll"
   reports against Schema, Project Settings tabs, Integrations, etc. */
[data-cactai-shell] .ds-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
[data-cactai-shell] .ds-panel-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
[data-cactai-shell] .ds-panel-section-title {
  font-family: var(--f-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ds-text-3);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ds-border-soft);
}
[data-cactai-shell] .ds-card {
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border-soft);
  border-radius: var(--ds-r-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
}
[data-cactai-shell] .ds-card-title {
  font-family: var(--f-ui);
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-text);
}
[data-cactai-shell] .ds-card-body {
  font-family: var(--f-ui);
  font-size: 12.5px;
  color: var(--ds-text-2);
  line-height: 1.6;
}
[data-cactai-shell] .ds-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--f-display);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: var(--ds-r-pill);
  border: 1px solid;
}
[data-cactai-shell] .ds-badge-sdk { color: var(--ds-text-3); border-color: var(--ds-border); }
[data-cactai-shell] .ds-badge-marketplace {
  color: var(--g-stop-1);
  border-color: color-mix(in srgb, var(--g-stop-1) 30%, transparent);
  background: color-mix(in srgb, var(--g-stop-1) 6%, transparent);
}
[data-cactai-shell] .ds-badge-dev {
  color: var(--g-stop-4);
  border-color: color-mix(in srgb, var(--g-stop-4) 30%, transparent);
  background: color-mix(in srgb, var(--g-stop-4) 6%, transparent);
}
[data-cactai-shell] .ds-badge-active {
  color: var(--c-success);
  border-color: color-mix(in srgb, var(--c-success) 30%, transparent);
  background: color-mix(in srgb, var(--c-success) 6%, transparent);
}

/* Toggle switch */
[data-cactai-shell] .ds-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-toggle input {
  opacity: 0;
  width: 0; height: 0;
  position: absolute;
}
[data-cactai-shell] .ds-toggle-track {
  position: absolute;
  inset: 0;
  border-radius: var(--ds-r-pill);
  background: var(--ds-border);
  transition: background var(--d-base) var(--ease);
  cursor: pointer;
}
[data-cactai-shell] .ds-toggle input:checked + .ds-toggle-track {
  background: var(--ds-grad-solid);
}
[data-cactai-shell] .ds-toggle-thumb {
  position: absolute;
  top: 3px; left: 3px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: white;
  transition: transform var(--d-base) var(--ease);
  pointer-events: none;
}
[data-cactai-shell] .ds-toggle input:checked ~ .ds-toggle-thumb { transform: translateX(16px); }

/* Progress bar */
[data-cactai-shell] .ds-progress {
  height: 4px;
  background: var(--ds-elevated);
  border-radius: var(--ds-r-pill);
  overflow: hidden;
}
[data-cactai-shell] .ds-progress-fill {
  height: 100%;
  background: var(--ds-grad-solid);
  border-radius: var(--ds-r-pill);
  transition: width var(--d-slow) var(--ease);
}

/* Workflow decision option button — universal interactive pattern, with a
   selected-state gradient ring. */
[data-cactai-shell] .ds-option-btn {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background: var(--ds-elevated);
  border: 1.5px solid var(--ds-border);
  border-radius: var(--ds-r-md);
  cursor: pointer;
  text-align: left;
  font-family: var(--f-ui);
  transition: transform var(--d-base) var(--ease),
              border-color var(--d-base) var(--ease),
              box-shadow var(--d-base) var(--ease),
              background var(--d-base) var(--ease);
  width: 100%;
}
[data-cactai-shell] .ds-option-btn:hover:not(.ds-option-selected):not(:disabled),
[data-cactai-shell] .ds-option-btn:focus-visible:not(.ds-option-selected):not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  outline: none;
}
[data-cactai-shell] .ds-option-btn.ds-option-selected {
  background-image: linear-gradient(var(--ds-elevated), var(--ds-elevated)), var(--ds-grad-solid);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  border-color: transparent;
}
[data-cactai-shell] .ds-option-btn.ds-option-recommended {
  border-color: color-mix(in srgb, var(--accent-solid, var(--c-accent)) 35%, transparent);
}
[data-cactai-shell] .ds-option-label {
  font-family: var(--f-ui);
  font-size: 13px;
  font-weight: 500;
  color: var(--ds-text);
}
[data-cactai-shell] .ds-option-rationale {
  font-family: var(--f-ui);
  font-size: 11.5px;
  color: var(--ds-text-2);
  line-height: 1.5;
}

/* Universal reduced-motion fallback — applies to every interactive class
   above. Removes the lift transform and the glow box-shadow; keeps only a
   brief color/border transition so focus is still visible. */
@media (prefers-reduced-motion: reduce) {
  [data-cactai-shell] .ds-view-btn,
  [data-cactai-shell] .ds-view-btn:hover,
  [data-cactai-shell] .ds-view-btn:focus-visible,
  [data-cactai-shell] .ds-btn-primary,
  [data-cactai-shell] .ds-btn-primary:hover,
  [data-cactai-shell] .ds-btn-primary:focus-visible,
  [data-cactai-shell] .ds-btn-ghost,
  [data-cactai-shell] .ds-btn-ghost:hover,
  [data-cactai-shell] .ds-btn-ghost:focus-visible,
  [data-cactai-shell] .ds-rail-btn,
  [data-cactai-shell] .ds-rail-btn:hover,
  [data-cactai-shell] .ds-rail-btn:focus-visible,
  [data-cactai-shell] .ds-avatar,
  [data-cactai-shell] .ds-avatar:hover,
  [data-cactai-shell] .ds-send-btn,
  [data-cactai-shell] .ds-send-btn:hover,
  [data-cactai-shell] .ds-tree-item,
  [data-cactai-shell] .ds-tree-item:hover,
  [data-cactai-shell] .ds-tree-item:focus-visible,
  [data-cactai-shell] .ds-option-btn,
  [data-cactai-shell] .ds-option-btn:hover,
  [data-cactai-shell] .ds-option-btn:focus-visible {
    transform: none;
    box-shadow: none;
    transition: border-color 100ms linear, color 100ms linear;
  }
}

/* ── CHARACTER ANIMATIONS ────────────────────────────────────────────── */

/* Owl — idle: slow head sway + occasional blink */
[data-cactai-shell] .ds-anim-owl-idle .owl-head {
  animation: ds-owl-idle-sway 5s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-owl-idle .owl-eye-l,
[data-cactai-shell] .ds-anim-owl-idle .owl-eye-r {
  /* transform-box: fill-box + transform-origin: center makes scaleY
     pivot around the eye's own bounding box. Without this, SVG
     elements default to transform-origin (0,0) at the SVG viewport
     top-left, so scaleY(0.1) collapses each eye toward y=0 and the
     eyes visibly fly up out of the head — barely noticeable at
     120 px, jarring at the 34 px chat-header size where the eyes
     leave the head outline entirely. */
  transform-box:   fill-box;
  transform-origin: center;
  animation: ds-owl-blink 6s ease-in-out infinite;
}
@keyframes ds-owl-idle-sway {
  0%, 100% { transform: rotate(0deg); }
  25%       { transform: rotate(3deg); }
  75%       { transform: rotate(-3deg); }
}
@keyframes ds-owl-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  94%           { transform: scaleY(0.1); }
  96%           { transform: scaleY(1); }
}

/* Owl — thinking: head down (peering over glasses), one wing raised */
[data-cactai-shell] .ds-anim-owl-think .owl-head {
  transform: rotate(12deg) translateY(3px);
  animation: ds-owl-think-nod 3s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-owl-think .owl-wing-r {
  transform: rotate(-15deg);
  animation: ds-owl-think-wing 2s ease-in-out infinite;
}
@keyframes ds-owl-think-nod {
  0%, 100% { transform: rotate(12deg) translateY(3px); }
  50%       { transform: rotate(14deg) translateY(4px); }
}
@keyframes ds-owl-think-wing {
  0%, 100% { transform: rotate(-15deg); }
  50%       { transform: rotate(-8deg); }
}

/* Owl — waiting: foot tap, wings crossed */
[data-cactai-shell] .ds-anim-owl-wait .owl-foot-r {
  animation: ds-owl-foot-tap 0.6s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-owl-wait .owl-wing-l {
  transform: rotate(25deg) translateX(6px);
}
[data-cactai-shell] .ds-anim-owl-wait .owl-wing-r {
  transform: rotate(-25deg) translateX(-6px);
}
[data-cactai-shell] .ds-anim-owl-wait .owl-brow-l,
[data-cactai-shell] .ds-anim-owl-wait .owl-brow-r {
  transform: translateY(-1.5px);
}
@keyframes ds-owl-foot-tap {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-3px); }
}

/* Owl — responding: slight forward lean, alert */
[data-cactai-shell] .ds-anim-owl-respond .owl-head {
  animation: ds-owl-respond-lean 1.2s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-owl-respond .owl-wing-l { transform: rotate(-5deg); }
[data-cactai-shell] .ds-anim-owl-respond .owl-wing-r { transform: rotate(5deg); }
@keyframes ds-owl-respond-lean {
  0%, 100% { transform: translateX(0) rotate(-2deg); }
  50%       { transform: translateX(1.5px) rotate(1deg); }
}

/* ── ROBOT (paired with SAM) ─────────────────────────────────────────────
   Easing: servo-driven feel. Use cubic-bezier(0.4, 0, 0.2, 1) where a
   non-trivial transition is involved; keyframes themselves are linear so
   the timing function on the animation controls the feel. */

/* Robot — idle: slow head pan + LED dim-bright cycle */
[data-cactai-shell] .ds-anim-robot-idle .robot-head {
  animation: ds-robot-idle-pan 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
[data-cactai-shell] .ds-anim-robot-idle .robot-eye {
  animation: ds-robot-led-pulse 3.5s ease-in-out infinite;
  /* SVG transforms need transform-box: fill-box so 'center' resolves
     to the element's own bounding box (default origin is the SVG
     viewport (0,0), making scales drift the element toward the
     viewport top-left). Same fix applied to the owl-eye blink above. */
  transform-box:   fill-box;
  transform-origin: center;
}
@keyframes ds-robot-idle-pan {
  0%, 100% { transform: rotate(0deg); }
  25%       { transform: rotate(8deg); }
  75%       { transform: rotate(-8deg); }
}
@keyframes ds-robot-led-pulse {
  0%, 100% { opacity: 0.6; transform: scale(0.92); }
  50%       { opacity: 1;   transform: scale(1.05); }
}

/* Robot — thinking: head tilt down + LED rapid hue shift */
[data-cactai-shell] .ds-anim-robot-think .robot-head {
  transform: rotate(0deg) translateY(2px);
  animation: ds-robot-think-tilt 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
[data-cactai-shell] .ds-anim-robot-think .robot-eye {
  animation: ds-robot-led-hue-shift 0.9s steps(4, end) infinite;
  transform-box:   fill-box;
  transform-origin: center;
}
[data-cactai-shell] .ds-anim-robot-think .robot-antenna {
  animation: ds-robot-led-pulse 1.2s ease-in-out infinite;
}
@keyframes ds-robot-think-tilt {
  0%, 100% { transform: rotate(0deg) translateY(2px); }
  50%       { transform: rotate(6deg) translateY(3px); }
}
@keyframes ds-robot-led-hue-shift {
  0%   { filter: hue-rotate(0deg);   opacity: 0.85; }
  25%  { filter: hue-rotate(45deg);  opacity: 1;    }
  50%  { filter: hue-rotate(-30deg); opacity: 0.85; }
  75%  { filter: hue-rotate(60deg);  opacity: 1;    }
  100% { filter: hue-rotate(0deg);   opacity: 0.85; }
}

/* Robot — waiting: looking-at-watch arm gesture, LED steady */
[data-cactai-shell] .ds-anim-robot-wait .robot-arm-l {
  transform: rotate(-55deg) translate(2px, -4px);
  animation: ds-robot-wait-arm 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
[data-cactai-shell] .ds-anim-robot-wait .robot-head {
  transform: rotate(-4deg);
}
[data-cactai-shell] .ds-anim-robot-wait .robot-eye {
  opacity: 0.8;
}
@keyframes ds-robot-wait-arm {
  0%, 100% { transform: rotate(-55deg) translate(2px, -4px); }
  50%       { transform: rotate(-50deg) translate(2px, -3px); }
}

/* Robot — responding: forward lean, LED bright + activated */
[data-cactai-shell] .ds-anim-robot-respond .robot-head {
  animation: ds-robot-respond-lean 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
[data-cactai-shell] .ds-anim-robot-respond .robot-body {
  transform: translateY(-0.5px);
}
[data-cactai-shell] .ds-anim-robot-respond .robot-eye {
  opacity: 1;
  animation: ds-robot-respond-led 0.9s ease-in-out infinite;
  transform-box:   fill-box;
  transform-origin: center;
}
[data-cactai-shell] .ds-anim-robot-respond .robot-antenna {
  animation: ds-robot-respond-led 0.9s ease-in-out infinite;
}
@keyframes ds-robot-respond-lean {
  0%, 100% { transform: translateX(0)     rotate(0deg); }
  50%       { transform: translateX(0.5px) rotate(2deg); }
}
@keyframes ds-robot-respond-led {
  0%, 100% { transform: scale(1);    opacity: 0.95; }
  50%       { transform: scale(1.18); opacity: 1;    }
}

/* ── PRAIRIE DOG (paired with Milo) ──────────────────────────────────────
   Easing: quick and alert with a small bounce. Spring easing
   cubic-bezier(0.34, 1.56, 0.64, 1) on pop motions per @cactai-io/brand-tokens. */

/* Prairie Dog — idle: upright alert, occasional head turn */
[data-cactai-shell] .ds-anim-prairie-dog-idle .prairie-dog-head {
  animation: ds-prairie-dog-idle-turn 6s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-prairie-dog-idle .prairie-dog-eye-l,
[data-cactai-shell] .ds-anim-prairie-dog-idle .prairie-dog-eye-r {
  animation: ds-prairie-dog-blink 5s ease-in-out infinite;
  transform-box:   fill-box;
  transform-origin: center;
}
@keyframes ds-prairie-dog-idle-turn {
  0%, 40%, 100% { transform: rotate(0deg); }
  55%            { transform: rotate(-10deg); }
  70%            { transform: rotate(8deg); }
  85%            { transform: rotate(0deg); }
}
@keyframes ds-prairie-dog-blink {
  0%, 93%, 100% { transform: scaleY(1); }
  95%            { transform: scaleY(0.15); }
  97%            { transform: scaleY(1); }
}

/* Prairie Dog — thinking: head tilts side to side, ears twitch */
[data-cactai-shell] .ds-anim-prairie-dog-think .prairie-dog-head {
  animation: ds-prairie-dog-think-tilt 2.2s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-prairie-dog-think .prairie-dog-ear-l {
  animation: ds-prairie-dog-ear-twitch 1.4s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-prairie-dog-think .prairie-dog-ear-r {
  animation: ds-prairie-dog-ear-twitch 1.4s ease-in-out infinite 0.2s;
}
@keyframes ds-prairie-dog-think-tilt {
  0%, 100% { transform: rotate(-6deg); }
  50%       { transform: rotate(6deg);  }
}
@keyframes ds-prairie-dog-ear-twitch {
  0%, 80%, 100% { transform: rotate(0deg); }
  85%            { transform: rotate(-12deg); }
  92%            { transform: rotate(8deg); }
}

/* Prairie Dog — waiting: paws together at chest, tail flick */
[data-cactai-shell] .ds-anim-prairie-dog-wait .prairie-dog-paw-l {
  transform: translate(2.2px, -1px);
}
[data-cactai-shell] .ds-anim-prairie-dog-wait .prairie-dog-paw-r {
  transform: translate(-2.2px, -1px);
}
[data-cactai-shell] .ds-anim-prairie-dog-wait .prairie-dog-tail {
  animation: ds-prairie-dog-tail-flick 1.4s ease-in-out infinite;
}
[data-cactai-shell] .ds-anim-prairie-dog-wait .prairie-dog-head {
  transform: rotate(-2deg);
}
@keyframes ds-prairie-dog-tail-flick {
  0%, 100% { transform: rotate(0deg); }
  30%       { transform: rotate(15deg); }
  60%       { transform: rotate(-10deg); }
}

/* Prairie Dog — responding: alarm-pop (upward bob) + paw clap */
[data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-head {
  animation: ds-prairie-dog-respond-pop 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}
[data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-body {
  animation: ds-prairie-dog-respond-bob 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  transform-origin: center bottom;
}
[data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-paw-l {
  animation: ds-prairie-dog-paw-clap-l 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}
[data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-paw-r {
  animation: ds-prairie-dog-paw-clap-r 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}
@keyframes ds-prairie-dog-respond-pop {
  0%, 100% { transform: translateY(0)    scale(1); }
  35%       { transform: translateY(-3px) scale(1.06); }
  60%       { transform: translateY(-1px) scale(1.02); }
}
@keyframes ds-prairie-dog-respond-bob {
  0%, 100% { transform: scaleY(1)    translateY(0); }
  35%       { transform: scaleY(1.04) translateY(-2px); }
  60%       { transform: scaleY(1)    translateY(0); }
}
@keyframes ds-prairie-dog-paw-clap-l {
  0%, 100% { transform: translate(0, 0); }
  35%       { transform: translate(2.5px, -1.5px); }
  55%       { transform: translate(0.5px, -0.5px); }
}
@keyframes ds-prairie-dog-paw-clap-r {
  0%, 100% { transform: translate(0, 0); }
  35%       { transform: translate(-2.5px, -1.5px); }
  55%       { transform: translate(-0.5px, -0.5px); }
}

/* Reduced-motion fallback for both new characters. The existing
   prefers-reduced-motion block above the character section disables
   transitions on chrome elements but doesn't list these characters
   explicitly. We disable just the animations here. */
@media (prefers-reduced-motion: reduce) {
  [data-cactai-shell] .ds-anim-robot-idle .robot-head,
  [data-cactai-shell] .ds-anim-robot-idle .robot-eye,
  [data-cactai-shell] .ds-anim-robot-think .robot-head,
  [data-cactai-shell] .ds-anim-robot-think .robot-eye,
  [data-cactai-shell] .ds-anim-robot-think .robot-antenna,
  [data-cactai-shell] .ds-anim-robot-wait .robot-arm-l,
  [data-cactai-shell] .ds-anim-robot-respond .robot-head,
  [data-cactai-shell] .ds-anim-robot-respond .robot-eye,
  [data-cactai-shell] .ds-anim-robot-respond .robot-antenna,
  [data-cactai-shell] .ds-anim-prairie-dog-idle .prairie-dog-head,
  [data-cactai-shell] .ds-anim-prairie-dog-idle .prairie-dog-eye-l,
  [data-cactai-shell] .ds-anim-prairie-dog-idle .prairie-dog-eye-r,
  [data-cactai-shell] .ds-anim-prairie-dog-think .prairie-dog-head,
  [data-cactai-shell] .ds-anim-prairie-dog-think .prairie-dog-ear-l,
  [data-cactai-shell] .ds-anim-prairie-dog-think .prairie-dog-ear-r,
  [data-cactai-shell] .ds-anim-prairie-dog-wait .prairie-dog-tail,
  [data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-head,
  [data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-body,
  [data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-paw-l,
  [data-cactai-shell] .ds-anim-prairie-dog-respond .prairie-dog-paw-r {
    animation: none;
  }
}

/* ── COMMIT FEATURE ─────────────────────────────────────────────────────
   Sync indicator, per-file commit affordance, pending-edits modal,
   commit-to-main confirmation modal, and the state-aware commit button
   in the Workspace panel header. Replaces the v1.0 top-bar commit button
   and the WorkspacePanel "Merge to main" card. */

/* Sync indicator — inline text at the top of the Files panel header.
   Secondary text color, no badge background, no border. The branch and
   status read at normal weight; the middle-dot separator is dimmed. */
[data-cactai-shell] .ds-sync-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--f-mono);
  font-size: 11px;
  color: var(--c-text-2);
  letter-spacing: 0.02em;
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-sync-indicator[data-branch="local"] .ds-sync-branch {
  color: var(--accent-solid, var(--c-warm));
}
[data-cactai-shell] .ds-sync-branch { font-weight: 500; }
[data-cactai-shell] .ds-sync-sep    { color: var(--c-text-3); }
[data-cactai-shell] .ds-sync-status { color: var(--c-text-2); }

/* Per-file inline commit icon — appears on hover/focus of a modified file
   row in the FileTree. Positioned in the same slot as the modified dot
   (right-aligned, after the filename), but only one of the two renders at
   a time: the dot shows on rest, the icon swaps in on hover/focus. */
[data-cactai-shell] .ds-tree-commit-btn {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--accent-solid, var(--c-accent));
  border-radius: var(--ds-r-sm);
  transition: background var(--d-fast) var(--ease),
              transform   var(--d-fast) var(--ease);
}
[data-cactai-shell] .ds-tree-commit-btn:hover,
[data-cactai-shell] .ds-tree-commit-btn:focus-visible {
  background: color-mix(in srgb, var(--accent-solid, var(--c-accent)) 12%, transparent);
  outline: none;
  transform: scale(1.1);
}
[data-cactai-shell] .ds-tree-commit-btn svg { display: block; }
/* On rest, the per-file commit button is hidden so the modified dot can
   take the right-aligned slot. On hover/focus of the row, swap them. */
[data-cactai-shell] .ds-tree-item .ds-tree-commit-btn { display: none; }
[data-cactai-shell] .ds-tree-item:hover .ds-tree-commit-btn,
[data-cactai-shell] .ds-tree-item:focus-within .ds-tree-commit-btn {
  display: inline-flex;
}
[data-cactai-shell] .ds-tree-item:hover .ds-tree-mod-dot,
[data-cactai-shell] .ds-tree-item:focus-within .ds-tree-mod-dot {
  display: none;
}

/* Thread 12 — hover-shown per-file undo button. Mirrors the
   per-file commit hover button to its left; both reveal on row hover
   or focus so the developer can either commit or revert the file
   without entering a modal. */
[data-cactai-shell] .ds-tree-restore-btn {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--c-warning, #FFD700);
  border-radius: var(--ds-r-sm);
  transition: background var(--d-fast) var(--ease),
              transform   var(--d-fast) var(--ease);
}
[data-cactai-shell] .ds-tree-restore-btn:hover,
[data-cactai-shell] .ds-tree-restore-btn:focus-visible {
  background: color-mix(in srgb, var(--c-warning, #FFD700) 12%, transparent);
  outline: none;
  transform: scale(1.1);
}
[data-cactai-shell] .ds-tree-restore-btn svg { display: block; }
[data-cactai-shell] .ds-tree-item .ds-tree-restore-btn { display: none; }
[data-cactai-shell] .ds-tree-item:hover .ds-tree-restore-btn,
[data-cactai-shell] .ds-tree-item:focus-within .ds-tree-restore-btn {
  display: inline-flex;
}

/* Thread 12 — per-file undo confirmation modal. Re-uses the commit
   modal chrome (backdrop, card, footer) and only adds the card-size
   override. */
[data-cactai-shell] .ds-undo-confirm-card { max-width: 440px; }

/* Right-click context menu on a modified file row. Anchored at the cursor
   position; one or two items deep. */
[data-cactai-shell] .ds-tree-context-menu {
  position: fixed;
  z-index: 800;
  min-width: 180px;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  padding: 4px;
  display: flex;
  flex-direction: column;
  animation: ds-context-menu-rise var(--d-fast) var(--ease) both;
}
[data-cactai-shell] .ds-tree-context-menu-item {
  background: transparent;
  border: none;
  text-align: left;
  padding: 6px 10px;
  font-family: var(--f-ui);
  font-size: 12px;
  color: var(--ds-text);
  border-radius: var(--ds-r-sm);
  cursor: pointer;
  transition: background var(--d-fast) var(--ease);
}
[data-cactai-shell] .ds-tree-context-menu-item:hover,
[data-cactai-shell] .ds-tree-context-menu-item:focus-visible {
  background: var(--ds-elevated, var(--c-bg-3));
  outline: none;
}
@keyframes ds-context-menu-rise {
  from { opacity: 0; transform: translateY(-2px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Workspace panel header — the commit button lives here. The button is
   state-aware: label and behavior change based on SyncState. Disabled
   state for "main · synced" is rendered as visually muted, not removed,
   so the header keeps a stable layout. */
[data-cactai-shell] .ds-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
[data-cactai-shell] .ds-panel-header-title {
  font-family: var(--f-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--ds-text);
  letter-spacing: 0.01em;
}
[data-cactai-shell] .ds-panel-header-commit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--c-border-med);
  border-radius: var(--ds-r-sm);
  padding: 5px 12px;
  font-family: var(--f-ui);
  font-size: 12px;
  font-weight: 500;
  color: var(--ds-text);
  cursor: pointer;
  transition: border-color var(--d-base) var(--ease),
              color        var(--d-base) var(--ease),
              background   var(--d-base) var(--ease),
              box-shadow   var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-panel-header-commit:hover:not(:disabled),
[data-cactai-shell] .ds-panel-header-commit:focus-visible:not(:disabled) {
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  outline: none;
}
[data-cactai-shell] .ds-panel-header-commit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Modal shell — used by PendingEditsModal (and the CommitHistoryModal that
   lands in Task 7 of the v1.2 commit-flow rebuild). Pattern mirrors the
   theme-inspector modal: backdrop + centered card with fade and rise
   animations. Disabled by prefers-reduced-motion. */
[data-cactai-shell] .ds-commit-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  animation: ds-commit-modal-fade var(--d-base) var(--ease) both;
}
[data-cactai-shell] .ds-commit-modal-card {
  width: min(640px, 92vw);
  max-height: 80vh;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--ds-r-md, 10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 80px rgba(0,0,0,0.35);
  animation: ds-commit-modal-rise var(--d-base) var(--ease-spring) both;
}
[data-cactai-shell] .ds-commit-modal-card.ds-commit-modal-confirm {
  width: min(480px, 90vw);
}
[data-cactai-shell] .ds-commit-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-commit-modal-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
[data-cactai-shell] .ds-commit-modal-title {
  font-family: var(--f-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text);
}
[data-cactai-shell] .ds-commit-modal-subtitle {
  font-family: var(--f-ui);
  font-size: 12px;
  color: var(--c-text-2);
}
[data-cactai-shell] .ds-commit-modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-commit-modal-error {
  background: color-mix(in srgb, var(--c-accent) 8%, transparent);
  border-bottom: 1px solid var(--c-border);
  padding: 10px 20px;
  font-family: var(--f-ui);
  font-size: 12px;
  color: var(--c-accent);
}
[data-cactai-shell] .ds-commit-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px 8px 20px;
}
[data-cactai-shell] .ds-commit-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--c-border);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-commit-modal-cancel {
  background: transparent;
  border: none;
  font-family: var(--f-ui);
  font-size: 12px;
  color: var(--c-text-2);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--ds-r-sm);
  transition: color var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-commit-modal-cancel:hover,
[data-cactai-shell] .ds-commit-modal-cancel:focus-visible {
  color: var(--c-text);
  outline: none;
}

/* Pending-edits modal — action buttons in the header, file list in the
   body. Buttons are equal weight (neither is primary). */
[data-cactai-shell] .ds-commit-modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--c-border-med);
  border-radius: var(--ds-r-sm);
  padding: 6px 12px;
  font-family: var(--f-ui);
  font-size: 12px;
  font-weight: 500;
  color: var(--c-text);
  cursor: pointer;
  transition: border-color var(--d-base) var(--ease),
              background   var(--d-base) var(--ease),
              box-shadow   var(--d-base) var(--ease),
              color        var(--d-base) var(--ease);
}
[data-cactai-shell] .ds-commit-modal-btn:hover:not(:disabled),
[data-cactai-shell] .ds-commit-modal-btn:focus-visible:not(:disabled) {
  border-color: var(--accent-solid, var(--c-accent));
  box-shadow: var(--glow-accent);
  outline: none;
}
[data-cactai-shell] .ds-commit-modal-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
[data-cactai-shell] .ds-commit-modal-btn.ds-commit-modal-btn-primary {
  background: var(--accent-solid, var(--c-accent));
  border-color: var(--accent-solid, var(--c-accent));
  color: #fff;
}
[data-cactai-shell] .ds-commit-modal-btn.ds-commit-modal-btn-primary:hover:not(:disabled),
[data-cactai-shell] .ds-commit-modal-btn.ds-commit-modal-btn-primary:focus-visible:not(:disabled) {
  filter: brightness(1.06);
}

/* File list inside the pending-edits modal. Each row is a checkbox label
   so clicking anywhere on the row toggles selection. */
[data-cactai-shell] .ds-commit-file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
[data-cactai-shell] .ds-commit-file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-family: var(--f-mono);
  font-size: 12px;
  border-radius: var(--ds-r-sm);
  cursor: pointer;
  transition: background var(--d-fast) var(--ease);
}
[data-cactai-shell] .ds-commit-file-row:hover {
  background: var(--c-bg-2);
}
[data-cactai-shell] .ds-commit-file-checkbox {
  flex-shrink: 0;
  accent-color: var(--accent-solid, var(--c-accent));
  cursor: pointer;
}
[data-cactai-shell] .ds-commit-file-path {
  flex: 1;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-cactai-shell] .ds-commit-file-diff {
  flex-shrink: 0;
  font-family: var(--f-mono);
  font-size: 11.5px;
  color: var(--c-text-2);
}
[data-cactai-shell] .ds-commit-file-diff-add    { color: var(--c-success); }
[data-cactai-shell] .ds-commit-file-diff-remove { color: var(--c-accent);  }

/* Confirmation modal body — summary text + optional warning. */
[data-cactai-shell] .ds-commit-confirm-body {
  padding: 16px 20px;
  font-family: var(--f-ui);
  font-size: 13px;
  color: var(--c-text);
  line-height: 1.55;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
[data-cactai-shell] .ds-commit-confirm-warning {
  background: color-mix(in srgb, var(--c-warm) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-warm) 30%, transparent);
  border-radius: var(--ds-r-sm);
  padding: 8px 10px;
  font-size: 12px;
  color: var(--c-text);
}
[data-cactai-shell] .ds-commit-confirm-file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: var(--f-mono);
  font-size: 12px;
  color: var(--c-text-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

@keyframes ds-commit-modal-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ds-commit-modal-rise {
  from { transform: translateY(8px) scale(0.992); opacity: 0; }
  to   { transform: translateY(0)    scale(1);     opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  [data-cactai-shell] .ds-commit-modal-backdrop,
  [data-cactai-shell] .ds-commit-modal-card,
  [data-cactai-shell] .ds-tree-context-menu {
    animation: none !important;
  }
  [data-cactai-shell] .ds-tree-commit-btn,
  [data-cactai-shell] .ds-tree-commit-btn:hover,
  [data-cactai-shell] .ds-tree-commit-btn:focus-visible,
  [data-cactai-shell] .ds-tree-restore-btn,
  [data-cactai-shell] .ds-tree-restore-btn:hover,
  [data-cactai-shell] .ds-tree-restore-btn:focus-visible {
    transition: none !important;
    transform: none !important;
  }
}

/* ── v1.2 commit-flow rebuild — tree status overlay, modal extras,
      diff viewer, role-view banner, deploy indicator, editor ─────────── */

/* Tree row status. The component sets ds-tree-pending + ds-tree-pending--<status>
   on the row; styles below paint each state. */
[data-cactai-shell] .ds-tree-pending--deleted .ds-tree-name {
  text-decoration: line-through;
  opacity: 0.55;
}
[data-cactai-shell] .ds-tree-pending--deleted .ds-tree-icon {
  opacity: 0.55;
}
[data-cactai-shell] .ds-tree-rename-arrow {
  margin-left: 6px;
  font-size: 11px;
  color: var(--ds-text-3);
  font-family: var(--f-mono);
}

/* Status badges — sit just to the right of the name. */
[data-cactai-shell] .ds-tree-status-badge {
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 6px;
  margin-left: 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
}
[data-cactai-shell] .ds-tree-status-badge--new {
  background: rgba(0, 214, 143, 0.18);
  color:      var(--c-success, #00D68F);
}
[data-cactai-shell] .ds-tree-status-badge--renamed,
[data-cactai-shell] .ds-tree-status-badge--moved {
  background: rgba(99, 102, 241, 0.18);
  color:      var(--c-primary, #6366F1);
}
[data-cactai-shell] .ds-tree-status-badge--deleted {
  background: rgba(255, 60, 119, 0.18);
  color:      var(--c-error, #FF3C77);
}

/* Per-row live-preview dot. Same pattern as deploy dot. */
[data-cactai-shell] .ds-tree-preview-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-left: 6px;
}
[data-cactai-shell] .ds-tree-preview-dot--live {
  background: var(--c-success, #00D68F);
}
[data-cactai-shell] .ds-tree-preview-dot--needs-deploy {
  background: var(--c-warning, #FFD700);
}

/* Modal extras introduced by the new PendingEditsModal and CommitHistoryModal. */
[data-cactai-shell] .ds-commit-op-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
[data-cactai-shell] .ds-commit-op-badge--edit   { background: rgba(99, 102, 241, 0.18); color: var(--c-primary, #6366F1); }
[data-cactai-shell] .ds-commit-op-badge--create { background: rgba(0, 214, 143, 0.18); color: var(--c-success, #00D68F); }
[data-cactai-shell] .ds-commit-op-badge--delete { background: rgba(255, 60, 119, 0.18); color: var(--c-error,   #FF3C77); }
[data-cactai-shell] .ds-commit-op-badge--rename,
[data-cactai-shell] .ds-commit-op-badge--move   { background: rgba(255, 215, 0, 0.18); color: var(--c-warning, #FFD700); }

[data-cactai-shell] .ds-commit-file-path-old {
  color: var(--ds-text-3);
  text-decoration: line-through;
}
[data-cactai-shell] .ds-commit-file-path-new {
  color: var(--ds-text);
}
[data-cactai-shell] .ds-commit-file-diff-pathmove {
  font-style: italic;
  color: var(--ds-text-3);
}
[data-cactai-shell] .ds-commit-file-inline-diff {
  padding: 6px 10px 10px;
  margin-top: 4px;
  background: var(--c-background, #0A0A0F);
  border-radius: 4px;
}

[data-cactai-shell] .ds-commit-modal-confirm-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 15, 0.55);
  border-radius: inherit;
  z-index: 10;
}
[data-cactai-shell] .ds-commit-modal-confirm-card {
  max-width: 360px;
  padding: 20px 22px 18px;
  background: var(--c-surface, #13131F);
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  border-radius: 8px;
  font-size: 13px;
}
[data-cactai-shell] .ds-commit-modal-confirm-text {
  margin-bottom: 16px;
  color: var(--ds-text);
}
[data-cactai-shell] .ds-commit-modal-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
[data-cactai-shell] .ds-commit-modal-link {
  background: transparent;
  border: none;
  color: var(--c-primary, #6366F1);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 12px;
  text-decoration: none;
}
[data-cactai-shell] .ds-commit-modal-link:hover { text-decoration: underline; }
[data-cactai-shell] .ds-commit-modal-discard-all {
  background: transparent;
  border: 1px solid var(--c-error, #FF3C77);
  color: var(--c-error, #FF3C77);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
[data-cactai-shell] .ds-commit-modal-discard-all:hover {
  background: rgba(255, 60, 119, 0.08);
}
[data-cactai-shell] .ds-commit-modal-count {
  flex: 1;
  text-align: right;
  font-size: 11px;
  color: var(--ds-text-3);
}

/* Commit-history modal layout. */
[data-cactai-shell] .ds-commit-history-card { max-width: 880px; }
[data-cactai-shell] .ds-commit-history-body { padding-top: 4px; }
[data-cactai-shell] .ds-commit-group { list-style: none; margin: 0 0 8px; padding: 0; }
[data-cactai-shell] .ds-commit-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: none;
  padding: 8px 6px;
  cursor: pointer;
  color: var(--ds-text);
  font-size: 12px;
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
}
[data-cactai-shell] .ds-commit-group-header:hover {
  background: rgba(255,255,255,0.03);
}
[data-cactai-shell] .ds-commit-group-chevron { font-size: 10px; color: var(--ds-text-3); }
[data-cactai-shell] .ds-commit-group-date    { font-family: var(--f-mono); font-size: 11px; color: var(--ds-text-2); }
[data-cactai-shell] .ds-commit-group-sha     { font-family: var(--f-mono); font-size: 11px; color: var(--ds-text-3); }
[data-cactai-shell] .ds-commit-group-message { color: var(--ds-text); }
[data-cactai-shell] .ds-commit-group-body    { padding: 4px 0 8px 24px; }
[data-cactai-shell] .ds-commit-group-loading { padding: 6px 4px; color: var(--ds-text-3); font-size: 12px; }

/* Thread 09 — time-range filter in the header. */
[data-cactai-shell] .ds-commit-history-filter {
  display: flex; align-items: center; gap: 6px;
  margin-right: 6px;
}
[data-cactai-shell] .ds-commit-history-filter-label {
  font-size: 11px; color: var(--ds-text-3);
}
[data-cactai-shell] .ds-commit-history-filter-select {
  font-size: 12px; padding: 4px 8px;
  background: var(--ds-elevated, rgba(255,255,255,0.04));
  color: var(--ds-text);
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  border-radius: var(--ds-r-sm, 4px);
}
[data-cactai-shell] .ds-commit-history-filter-edit { font-size: 11px; }
[data-cactai-shell] .ds-commit-history-filter-summary { color: var(--ds-text-3); }
[data-cactai-shell] .ds-commit-history-range-picker {
  display: flex; align-items: end; gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
  background: rgba(255,255,255,0.02);
  flex-wrap: wrap;
}
[data-cactai-shell] .ds-commit-history-range-field {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 11px; color: var(--ds-text-3);
}
[data-cactai-shell] .ds-commit-history-range-field input {
  font-size: 12px; padding: 4px 6px;
  background: var(--ds-elevated, rgba(255,255,255,0.04));
  color: var(--ds-text);
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  border-radius: var(--ds-r-sm, 4px);
}

/* Thread 09 + 12 — per-commit kebab menu + revert pill. */
[data-cactai-shell] .ds-commit-group-header-wrap {
  position: relative;
  display: flex; align-items: stretch; gap: 0;
}
[data-cactai-shell] .ds-commit-group-header-wrap > .ds-commit-group-header { flex: 1; }
[data-cactai-shell] .ds-commit-group-actions {
  position: relative;
  display: flex; align-items: center;
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
}
[data-cactai-shell] .ds-commit-group-kebab {
  background: transparent; border: none;
  color: var(--ds-text-3);
  font-size: 14px; padding: 0 12px;
  cursor: pointer; height: 100%;
}
[data-cactai-shell] .ds-commit-group-kebab:hover { color: var(--ds-text); background: rgba(255,255,255,0.03); }
[data-cactai-shell] .ds-commit-group-menu {
  position: absolute; right: 4px; top: 100%;
  background: var(--ds-elevated, #1b1f24);
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  border-radius: var(--ds-r-sm, 6px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  z-index: 10;
  min-width: 180px;
  padding: 4px 0;
}
[data-cactai-shell] .ds-commit-group-menu-item {
  display: block; width: 100%; text-align: left;
  background: transparent; border: none;
  padding: 8px 12px; font-size: 12px;
  color: var(--ds-text);
  cursor: pointer;
}
[data-cactai-shell] .ds-commit-group-menu-item:hover { background: rgba(255,255,255,0.05); }
[data-cactai-shell] .ds-commit-group-revert-pill {
  font-size: 10px; padding: 1px 6px;
  background: rgba(255, 215, 0, 0.18);
  color: var(--c-warning, #FFD700);
  border-radius: 999px;
  margin-left: 6px;
  font-family: var(--f-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
[data-cactai-shell] .ds-commit-revert-confirm-sub {
  margin: 4px 0 8px; display: flex; gap: 8px; align-items: center;
}
[data-cactai-shell] .ds-commit-revert-confirm-msg {
  color: var(--ds-text); font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 360px;
}

/* Thread 11 — CommitConflictModal. */
[data-cactai-shell] .ds-commit-conflict-card { max-width: 1040px; width: min(96vw, 1040px); }
[data-cactai-shell] .ds-commit-conflict-body { padding-top: 4px; }
[data-cactai-shell] .ds-commit-conflict-list { list-style: none; margin: 0; padding: 0; }
[data-cactai-shell] .ds-commit-conflict-li { border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06)); }
[data-cactai-shell] .ds-commit-conflict-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 6px;
  font-size: 12px;
}
[data-cactai-shell] .ds-commit-conflict-reason {
  color: var(--c-warning, #FFD700);
  font-size: 11px;
}
[data-cactai-shell] .ds-commit-conflict-resolution-tag {
  margin-left: auto;
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: var(--ds-text-2);
  font-family: var(--f-mono);
}
[data-cactai-shell] .ds-commit-conflict-preview {
  padding: 4px 0 12px 24px;
  display: flex; flex-direction: column; gap: 8px;
}
[data-cactai-shell] .ds-commit-conflict-preview-fallback {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
[data-cactai-shell] .ds-commit-conflict-preview-side {
  display: flex; flex-direction: column; gap: 4px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--c-border, rgba(255,255,255,0.06));
  border-radius: 4px;
  padding: 6px 8px;
}
[data-cactai-shell] .ds-commit-conflict-preview-side-label {
  font-size: 11px; color: var(--ds-text-3);
  text-transform: uppercase; letter-spacing: 0.04em;
}
[data-cactai-shell] .ds-commit-conflict-preview-side-empty {
  font-size: 11.5px; color: var(--ds-text-3); font-style: italic;
}
[data-cactai-shell] .ds-commit-conflict-preview-side pre {
  margin: 0; font-family: var(--f-mono); font-size: 11px;
  max-height: 180px; overflow: auto;
  color: var(--ds-text);
}
[data-cactai-shell] .ds-commit-conflict-actions {
  display: flex; gap: 8px;
}
[data-cactai-shell] .ds-commit-conflict-manual {
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  border-radius: 4px;
  margin-top: 4px;
  overflow: hidden;
}
[data-cactai-shell] .ds-commit-conflict-manual-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 8px;
  background: rgba(255,255,255,0.03);
  font-size: 11px; color: var(--ds-text-2);
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
}

/* Thread 11 — end. */

/* Thread 12 — reverting overlay. */
[data-cactai-shell] .ds-commit-reverting-card {
  max-width: 480px;
}
[data-cactai-shell] .ds-commit-reverting-card .ds-commit-modal-empty {
  padding: 16px 12px;
}
/* Thread 12 — end. */


[data-cactai-shell] .ds-diff-block {
  font-family: var(--f-mono);
  font-size: 11.5px;
  line-height: 1.55;
  border-radius: 4px;
  overflow: auto;
}
[data-cactai-shell] .ds-diff-block--rich {
  /* The rich viewer brings its own table layout; we drop the outer
     'overflow: auto' so the viewer's own horizontal scroll wins, and
     leave the border-radius for the toolbar. */
  overflow: visible;
}
[data-cactai-shell] .ds-diff-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--ds-text-2);
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
}
[data-cactai-shell] .ds-diff-toolbar-stats {
  font-family: var(--f-mono);
}
[data-cactai-shell] .ds-diff-toolbar-spacer { flex: 1; }
[data-cactai-shell] .ds-diff-mode-toggle {
  background: transparent;
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  color: var(--ds-text-2);
  font-size: 10.5px;
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 999px;
}
[data-cactai-shell] .ds-diff-mode-toggle:hover { color: var(--ds-text); }
[data-cactai-shell] .ds-diff-mode-toggle--active {
  background: rgba(99,102,241,0.18);
  color: var(--c-primary, #6366F1);
  border-color: var(--c-primary, #6366F1);
}
[data-cactai-shell] .ds-diff-pre {
  margin: 0;
  padding: 4px 0;
}
[data-cactai-shell] .ds-diff-line {
  display: flex;
  align-items: flex-start;
  padding: 0 8px;
  white-space: pre;
}
[data-cactai-shell] .ds-diff-line-marker {
  display: inline-block;
  width: 16px;
  color: var(--ds-text-3);
  user-select: none;
}
[data-cactai-shell] .ds-diff-line--add {
  background: rgba(0, 214, 143, 0.12);
}
[data-cactai-shell] .ds-diff-line--add .ds-diff-line-marker {
  color: var(--c-success, #00D68F);
}
[data-cactai-shell] .ds-diff-line--remove {
  background: rgba(255, 60, 119, 0.12);
}
[data-cactai-shell] .ds-diff-line--remove .ds-diff-line-marker {
  color: var(--c-error, #FF3C77);
}
[data-cactai-shell] .ds-diff-line--context {
  color: var(--ds-text-2);
}
[data-cactai-shell] .ds-diff-show-all {
  display: block;
  width: 100%;
  background: transparent;
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  color: var(--c-primary, #6366F1);
  padding: 6px;
  margin-top: 4px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 11px;
}
[data-cactai-shell] .ds-diff-show-all:hover {
  background: rgba(99, 102, 241, 0.08);
}
[data-cactai-shell] .ds-diff-empty {
  padding: 8px 12px;
  color: var(--ds-text-3);
  font-size: 12px;
  font-style: italic;
}

/* Role-view banner. */
[data-cactai-shell] .ds-role-view-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  margin: 8px;
  border-radius: 6px;
  background: rgba(255, 215, 0, 0.10);
  border: 1px solid rgba(255, 215, 0, 0.30);
  color: var(--ds-text);
  font-size: 12px;
  position: sticky;
  top: 0;
  z-index: 4;
}
[data-cactai-shell] .ds-role-view-banner-icon {
  color: var(--c-warning, #FFD700);
}
[data-cactai-shell] .ds-role-view-banner-text { flex: 1; }
[data-cactai-shell] .ds-role-view-banner-dismiss {
  background: transparent;
  border: none;
  color: var(--ds-text-2);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}
[data-cactai-shell] .ds-role-view-banner-dismiss:hover {
  color: var(--ds-text);
}

/* Deploy indicator. */
[data-cactai-shell] .ds-deploy-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ds-text-2);
}
[data-cactai-shell] .ds-deploy-indicator-label {
  font-family: var(--f-ui);
}
[data-cactai-shell] .ds-deploy-indicator-open {
  margin-left: 6px;
  color: var(--c-primary, #6366F1);
  text-decoration: none;
}
[data-cactai-shell] .ds-deploy-indicator-open:hover { text-decoration: underline; }
[data-cactai-shell] .ds-deploy-indicator--link {
  text-decoration: none;
}
[data-cactai-shell] .ds-deploy-dot--building {
  animation: ds-deploy-pulse 1.6s ease-in-out infinite;
}
@keyframes ds-deploy-pulse {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 1; }
}

/* Editor (Monaco wrapper). Most styling lives inside Monaco; we own the
   shell chrome around it — tab strip, header, banner, body sizing. */
[data-cactai-shell] .ds-editor-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--c-surface, #13131F);
}
[data-cactai-shell] .ds-editor-tabs {
  display: flex;
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
  background: var(--c-background, #0A0A0F);
  overflow-x: auto;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-editor-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--ds-text-2);
  border-right: 1px solid var(--c-border, rgba(255,255,255,0.06));
  white-space: nowrap;
}
[data-cactai-shell] .ds-editor-tab--active {
  color: var(--ds-text);
  background: var(--c-surface, #13131F);
  box-shadow: inset 0 -2px 0 var(--c-primary, #6366F1);
}
[data-cactai-shell] .ds-editor-tab-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-warning, #FFD700);
}
[data-cactai-shell] .ds-editor-tab-close {
  background: transparent;
  border: none;
  color: var(--ds-text-3);
  cursor: pointer;
  padding: 0 2px;
  font-size: 13px;
}
[data-cactai-shell] .ds-editor-tab-close:hover { color: var(--ds-text); }
[data-cactai-shell] .ds-editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--c-surface, #13131F);
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
  font-size: 11px;
  flex-shrink: 0;
}
[data-cactai-shell] .ds-editor-header-path {
  font-family: var(--f-mono);
  color: var(--ds-text-2);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-cactai-shell] .ds-editor-header-save { color: var(--ds-text-3); }
[data-cactai-shell] .ds-editor-header-preview--live {
  color: var(--c-success, #00D68F);
}
[data-cactai-shell] .ds-editor-header-preview--needs-deploy {
  color: var(--c-warning, #FFD700);
}
[data-cactai-shell] .ds-editor-header-diff-toggle {
  background: transparent;
  border: 1px solid var(--c-border, rgba(255,255,255,0.10));
  color: var(--ds-text-2);
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}
[data-cactai-shell] .ds-editor-header-diff-toggle[aria-pressed="true"] {
  background: rgba(99, 102, 241, 0.12);
  color: var(--c-primary, #6366F1);
  border-color: var(--c-primary, #6366F1);
}
[data-cactai-shell] .ds-editor-cross-tab-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(255, 215, 0, 0.10);
  border-bottom: 1px solid rgba(255, 215, 0, 0.30);
  font-size: 11px;
  color: var(--ds-text);
  flex-shrink: 0;
}
[data-cactai-shell] .ds-editor-cross-tab-actions { display: flex; gap: 6px; }
[data-cactai-shell] .ds-editor-cross-tab-actions button {
  background: transparent;
  border: 1px solid var(--c-border, rgba(255,255,255,0.10));
  color: var(--ds-text-2);
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}
[data-cactai-shell] .ds-editor-body { flex: 1; min-height: 0; }
[data-cactai-shell] .ds-editor-empty,
[data-cactai-shell] .ds-editor-loading {
  padding: 24px;
  color: var(--ds-text-3);
  font-size: 13px;
}

/* File conflict modal. */
[data-cactai-shell] .ds-file-conflict-card { max-width: 980px; }
[data-cactai-shell] .ds-file-conflict-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
}
[data-cactai-shell] .ds-file-conflict-col {
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  border-radius: 6px;
  background: var(--c-background, #0A0A0F);
  display: flex;
  flex-direction: column;
  min-height: 200px;
}
[data-cactai-shell] .ds-file-conflict-col--missing {
  padding: 16px;
  color: var(--ds-text-3);
  font-style: italic;
}
[data-cactai-shell] .ds-file-conflict-col-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--c-border, rgba(255,255,255,0.06));
  font-size: 11px;
}
[data-cactai-shell] .ds-file-conflict-col-label { color: var(--ds-text); font-weight: 600; }
[data-cactai-shell] .ds-file-conflict-col-time  { color: var(--ds-text-3); }
[data-cactai-shell] .ds-file-conflict-col-preview {
  flex: 1;
  margin: 0;
  padding: 8px 12px;
  font-family: var(--f-mono);
  font-size: 11px;
  color: var(--ds-text);
  white-space: pre;
  overflow: auto;
  max-height: 280px;
}
[data-cactai-shell] .ds-file-conflict-col-actions {
  display: flex;
  gap: 8px;
  padding: 6px 12px;
  border-top: 1px solid var(--c-border, rgba(255,255,255,0.06));
  font-size: 11px;
}
[data-cactai-shell] .ds-file-conflict-full-diff {
  margin: 0 16px 12px;
  border: 1px solid var(--c-border, rgba(255,255,255,0.08));
  border-radius: 6px;
  overflow: hidden;
}
[data-cactai-shell] .ds-file-conflict-full-diff-header {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 11px;
  background: var(--c-background, #0A0A0F);
  color: var(--ds-text-2);
}
[data-cactai-shell] .ds-file-conflict-full-diff-header button {
  background: transparent;
  border: 1px solid var(--c-border, rgba(255,255,255,0.10));
  color: var(--ds-text-2);
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}
[data-cactai-shell] .ds-file-conflict-footer { gap: 8px; }
[data-cactai-shell] .ds-file-conflict-prompt {
  color: var(--ds-text);
  font-size: 12px;
  margin-right: 8px;
}

/* ──────────────────────────────────────────────────────────────────────
   v1.2.3 motion choreography — additions on top of the existing
   interactive-states pattern. Every rule below references --d-* and
   --ease* tokens; every infinite ambient animation carries an explicit
   reduce-motion exit at the bottom of this block.
   ────────────────────────────────────────────────────────────────────── */

/* Sync indicator — fades the changed status text and badge-pops the
   branch dot whenever the data-branch attribute flips. The animation
   re-runs because the attribute change re-applies the inline rule on
   the matching child. */
[data-cactai-shell] .ds-sync-indicator .ds-sync-status {
  animation: cactai-fade-in var(--d-base) var(--ease) both;
}
[data-cactai-shell] .ds-sync-indicator[data-branch="local"] .ds-sync-branch {
  animation: cactai-badge-pop var(--d-base) var(--ease-spring) both;
}

/* Per-file modified indicator appearance — pops in when a file first
   becomes modified. The dot itself stays visible until the file is
   reverted; the animation only fires on the first paint of the dot
   because the parent <li> remounts when the modification flag flips
   on. */
[data-cactai-shell] .ds-tree-mod-dot {
  animation: cactai-badge-pop var(--d-base) var(--ease-spring) both;
}

/* Per-file inline commit icon hover swap — fades the button in/out as
   the tree-item gains hover/focus. Replaces the implicit no-transition
   swap with a smooth crossfade against the dot. */
[data-cactai-shell] .ds-tree-commit-btn {
  transition:
    opacity var(--d-fast) var(--ease),
    transform var(--d-fast) var(--ease);
}
[data-cactai-shell] .ds-tree-item:hover .ds-tree-commit-btn,
[data-cactai-shell] .ds-tree-item:focus-within .ds-tree-commit-btn {
  opacity: 1;
  transform: scale(1);
}

/* File-tree directory expansion is left as an instant swap. The existing
   tree markup renders children as a fragment with no wrapper element to
   apply an entrance animation to, and wrapping would shift layout. The
   per-file modified-dot pop above is the durable signal that the tree
   has changed. */

/* Chat message arrival — incoming bubbles rise in. Existing bubbles do
   not re-animate because the animation is keyed to first mount. */
[data-cactai-shell] .ds-msg {
  animation: cactai-fade-up var(--d-base) var(--ease) both;
}

/* Streaming bubble — entrance is a softer fade-in than the .ds-msg
   default fade-up so the swap from ThinkingDots → streaming text doesn't
   visibly displace the bubble. The streaming bubble inherits .ds-msg, so
   without this override it would also fade-up; the more-specific rule
   wins because it lists ds-streaming-bubble on the same element.
   The bubble re-renders many times during a turn as tokens arrive; the
   animation only plays once because animation-fill-mode 'both' keeps
   the final state without re-triggering. */
[data-cactai-shell] .ds-msg.ds-streaming-bubble {
  animation: cactai-fade-in var(--d-base) var(--ease) both;
}

/* Streaming text body — split into a static head and an animated tail.
   The head is plain body text; the tail wears the brand-CTA gradient via
   background-clip: text with a slow background-position cycle so the
   gradient sweeps through the most recent ~80 characters. Reads as the
   agent "thinking through" the section currently arriving. */
[data-cactai-shell] .ds-streaming-head {
  color: var(--ds-text);
}
[data-cactai-shell] .ds-streaming-tail {
  background: var(--gradient-brand-cta);
  background-size: 200% 100%;
  background-position: 0% 50%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: cactai-gradient-sweep 2.4s linear infinite alternate;
}
@media (prefers-reduced-motion: reduce) {
  [data-cactai-shell] .ds-streaming-tail {
    animation: none !important;
    /* Resting state: gradient still applied, just not moving — keeps the
       visual difference between head (settled) and tail (currently
       arriving) without any motion. */
  }
}

/* Panel switching — the rail toggles which panel is rendered. When a
   new panel mounts, its contents rise in. */
[data-cactai-shell] .ds-panel {
  animation: cactai-fade-up var(--d-base) var(--ease) both;
}

/* View switching (Dev/Plan body). The view-content wrapper fades when
   the active view changes. Consumers add data-view-key on this element
   and React's key=... handling guarantees the animation re-runs. */
[data-cactai-shell] .ds-view-body {
  animation: cactai-fade-in var(--d-base) var(--ease) both;
}

/* Preview-as picker — selection state change transitions border and
   background. The .ds-preview-as-btn rule above already sets the
   transition, so the new active state inherits it. */
[data-cactai-shell] .ds-preview-as-active {
  transition:
    background var(--d-base) var(--ease),
    color var(--d-base) var(--ease),
    border-color var(--d-base) var(--ease);
}

/* Studio overlay / ThemeInspector entrance. The inspector slides in
   from the right; backdrop fades. */
[data-cactai-shell] .ds-studio-overlay-backdrop,
[data-cactai-shell] .ds-theme-inspector-backdrop {
  animation: cactai-fade-in var(--d-base) var(--ease) both;
}
[data-cactai-shell] .ds-studio-overlay-panel,
[data-cactai-shell] .ds-theme-inspector-panel {
  animation: cactai-slide-in-right var(--d-base) var(--ease-spring) both;
}

/* Commit button state transitions. The button already has the
   interactive pattern via .ds-btn-primary; this adds a subtle
   gradient-shift on busy state. */
[data-cactai-shell] .ds-commit-busy {
  animation: cactai-pulse 1.4s ease-in-out infinite;
}

/* Provider-key modal — same fade+rise as the commit modal so a
   capability prompt feels like part of the same family. */
[data-cactai-shell] .ds-provider-key-backdrop {
  animation: cactai-fade-in var(--d-base) var(--ease) both;
}
[data-cactai-shell] .ds-provider-key-card {
  animation: cactai-rise-spring var(--d-base) var(--ease-spring) both;
}

/* Reduce-motion silences ambient looping animations from this block. */
@media (prefers-reduced-motion: reduce) {
  [data-cactai-shell] .ds-commit-busy {
    animation: none !important;
  }
}
`;
export function injectDevShellStyles() {
    if (typeof document === 'undefined')
        return;
    if (document.getElementById(DS_STYLE_TAG_ID))
        return;
    const tag = document.createElement('style');
    tag.id = DS_STYLE_TAG_ID;
    tag.textContent = DEVSHELL_CSS;
    document.head.appendChild(tag);
}
//# sourceMappingURL=DevShellStyles.js.map