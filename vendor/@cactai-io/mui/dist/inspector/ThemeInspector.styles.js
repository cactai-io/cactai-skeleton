// packages/mui/src/inspector/ThemeInspector.styles.ts
//
// Style sheet for the Theme Inspector, mounted by ThemeInspector.tsx on
// first render. Single template literal, scoped under [data-theme-inspector]
// so it can never collide with DevShell chrome or skeleton-app styles.
//
// Aesthetic decisions:
//   - Display headers use Syne (--f-display) — distinct from the UI font.
//   - Body uses Geist Sans (--f-ui).
//   - Token values + paths use Fira Code (--f-mono) — they ARE code.
//   - The hairline on the left tree uses --c-border-med for clear hierarchy;
//     the gutter between columns is a 1px line, not a gap.
//   - Locked tokens get a tiny lock glyph and 0.5 opacity, with interaction
//     fully disabled by pointer-events.
//   - The sunset gradient appears once, on the Save button — high-impact
//     placement following the "dominant + sharp accent" guidance.
//   - Spring easing only on the save-button press (release moment).
//   - prefers-reduced-motion disables all transitions.
const TAG_ID = 'cactai-theme-inspector-styles';
const CSS = `
[data-theme-inspector] {
  font-family: var(--f-ui);
  color: var(--c-text);
  background: var(--c-bg);
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  contain: layout;
}

[data-theme-inspector] .ti-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--c-border-med);
  background: var(--c-surface);
}

[data-theme-inspector] .ti-title {
  font-family: var(--f-display);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0;
}

[data-theme-inspector] .ti-locked-banner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--c-text-2);
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--c-bg-2);
  border: 1px solid var(--c-border);
  cursor: pointer;
  font-family: var(--f-ui);
}
[data-theme-inspector] .ti-locked-banner:hover { color: var(--c-text); }
[data-theme-inspector] .ti-locked-banner .ti-lock-glyph {
  width: 12px; height: 12px;
  flex-shrink: 0;
}

[data-theme-inspector] .ti-spacer { flex: 1; }

[data-theme-inspector] .ti-cancel,
[data-theme-inspector] .ti-save {
  font-family: var(--f-ui);
  font-size: 12px;
  font-weight: 500;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform var(--d-fast) var(--ease), box-shadow var(--d-fast) var(--ease);
}
[data-theme-inspector] .ti-cancel {
  background: transparent;
  border-color: var(--c-border-med);
  color: var(--c-text-2);
}
[data-theme-inspector] .ti-cancel:hover { color: var(--c-text); }
[data-theme-inspector] .ti-save {
  color: white;
  border: none;
  background: linear-gradient(135deg, var(--g-stop-1), var(--g-stop-2) 40%, var(--g-stop-3) 70%, var(--g-stop-4));
  box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 2px 6px rgba(255, 60, 119, 0.18);
}
[data-theme-inspector] .ti-save:disabled {
  background: var(--c-bg-3);
  color: var(--c-text-3);
  box-shadow: none;
  cursor: not-allowed;
}
[data-theme-inspector] .ti-save:not(:disabled):active {
  transform: translateY(1px) scale(0.985);
  transition: transform 90ms var(--ease-spring);
}

[data-theme-inspector] .ti-body {
  display: grid;
  grid-template-columns: 240px 1fr 1fr;
  height: 100%;
  min-height: 0;
}
[data-theme-inspector] .ti-col {
  min-height: 0;
  overflow: auto;
}
[data-theme-inspector] .ti-col + .ti-col {
  border-left: 1px solid var(--c-border);
}

/* ── Token tree (left column) ──────────────────────────────────────────── */

[data-theme-inspector] .ti-tree {
  padding: 8px 0;
}
[data-theme-inspector] .ti-tree-group {
  margin: 0;
}
[data-theme-inspector] .ti-tree-group-label {
  font-family: var(--f-display);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--c-text-3);
  padding: 14px 18px 4px;
}
[data-theme-inspector] .ti-tree-leaf {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 18px;
  cursor: pointer;
  border-left: 2px solid transparent;
  font-size: 12px;
  transition: background var(--d-fast) var(--ease);
}
[data-theme-inspector] .ti-tree-leaf:hover {
  background: var(--c-bg-2);
}
[data-theme-inspector] .ti-tree-leaf[data-selected="true"] {
  background: var(--c-bg-2);
  border-left-color: var(--c-accent);
  color: var(--c-text);
}
[data-theme-inspector] .ti-tree-leaf[data-locked="true"] {
  opacity: 0.55;
}
[data-theme-inspector] .ti-tree-leaf-path {
  font-family: var(--f-mono);
  font-size: 11.5px;
  color: var(--c-text-2);
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
[data-theme-inspector] .ti-tree-leaf[data-selected="true"] .ti-tree-leaf-path { color: var(--c-text); }

[data-theme-inspector] .ti-tree-leaf-swatch {
  width: 12px; height: 12px;
  border-radius: 3px;
  border: 1px solid var(--c-border-med);
  flex-shrink: 0;
}
[data-theme-inspector] .ti-tree-leaf-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--c-text-3);
  flex-shrink: 0;
}
[data-theme-inspector] .ti-tree-leaf-dot[data-dirty="true"] {
  background: var(--c-accent);
}
[data-theme-inspector] .ti-tree-leaf-lock {
  width: 11px; height: 11px;
  color: var(--c-text-3);
  flex-shrink: 0;
}

/* ── Control panel (middle column) ─────────────────────────────────────── */

[data-theme-inspector] .ti-control {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
[data-theme-inspector] .ti-control-empty {
  color: var(--c-text-3);
  font-size: 13px;
  font-family: var(--f-ui);
  padding: 40px 24px;
  text-align: center;
}
[data-theme-inspector] .ti-control-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-border);
}
[data-theme-inspector] .ti-control-path {
  font-family: var(--f-mono);
  font-size: 12px;
  color: var(--c-text-2);
}
[data-theme-inspector] .ti-control-kind {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--c-text-3);
}
[data-theme-inspector] .ti-control-locked-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--c-text-2);
  padding: 8px 10px;
  background: var(--c-bg-2);
  border-radius: 6px;
}

[data-theme-inspector] [data-locked="true"] .ti-input,
[data-theme-inspector] [data-locked="true"] .ti-control-body {
  pointer-events: none;
  opacity: 0.5;
}

/* ── Generic inputs (used inside controls) ─────────────────────────────── */

[data-theme-inspector] .ti-input {
  font-family: var(--f-mono);
  font-size: 12.5px;
  padding: 7px 10px;
  border: 1px solid var(--c-border-med);
  border-radius: 6px;
  background: var(--c-surface);
  color: var(--c-text);
  transition: border-color var(--d-fast) var(--ease);
  width: 100%;
  box-sizing: border-box;
}
[data-theme-inspector] .ti-input:focus {
  outline: none;
  border-color: var(--c-accent);
}
[data-theme-inspector] .ti-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
[data-theme-inspector] .ti-row > .ti-input { flex: 1; }

[data-theme-inspector] .ti-color-swatch {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid var(--c-border-med);
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
[data-theme-inspector] .ti-color-swatch input[type="color"] {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  border: none;
  cursor: pointer;
  background: transparent;
  padding: 0;
}

[data-theme-inspector] .ti-slider {
  width: 100%;
  accent-color: var(--c-accent);
}
[data-theme-inspector] .ti-unit-toggle {
  display: inline-flex;
  background: var(--c-bg-2);
  border-radius: 6px;
  padding: 2px;
  border: 1px solid var(--c-border);
}
[data-theme-inspector] .ti-unit-toggle button {
  font-family: var(--f-mono);
  font-size: 11px;
  padding: 3px 9px;
  border: none;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  border-radius: 4px;
}
[data-theme-inspector] .ti-unit-toggle button[data-active="true"] {
  background: var(--c-surface);
  color: var(--c-text);
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}

[data-theme-inspector] .ti-shadow-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
[data-theme-inspector] .ti-shadow-cell label {
  display: block;
  font-size: 10.5px;
  color: var(--c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
[data-theme-inspector] .ti-shadow-preview {
  height: 56px;
  border-radius: 8px;
  background: var(--c-surface);
}

/* ── Preview (right column) ────────────────────────────────────────────── */

[data-theme-inspector] .ti-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}
[data-theme-inspector] .ti-preview-label {
  font-family: var(--f-display);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--c-text-3);
  padding: 14px 18px 8px;
}
[data-theme-inspector] .ti-preview-iframe {
  flex: 1;
  border: none;
  background: var(--c-bg-2);
  width: 100%;
}
[data-theme-inspector] .ti-preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-3);
  font-size: 12px;
  padding: 24px;
  text-align: center;
}

/* ── Modal shell (when the inspector renders inside a modal wrapper) ──── */

[data-theme-inspector-modal] {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ti-modal-fade-in var(--d-base) var(--ease) both;
}
[data-theme-inspector-modal] .ti-modal-card {
  width: min(1180px, 94vw);
  height: min(720px, 88vh);
  background: var(--c-bg);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset;
  animation: ti-modal-rise var(--d-base) var(--ease-spring) both;
}
@keyframes ti-modal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ti-modal-rise {
  from { transform: translateY(8px) scale(0.992); }
  to   { transform: translateY(0)    scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  [data-theme-inspector] *, [data-theme-inspector-modal] * {
    animation: none !important;
    transition: none !important;
  }
}
`.trim();
export function injectInspectorStyles() {
    if (typeof document === 'undefined')
        return;
    if (document.getElementById(TAG_ID))
        return;
    const tag = document.createElement('style');
    tag.id = TAG_ID;
    tag.textContent = CSS;
    document.head.appendChild(tag);
}
//# sourceMappingURL=ThemeInspector.styles.js.map