// packages/mui/src/inspector/controls/types.ts
//
// Shared types for the Theme Inspector controls.
//
// Every control accepts the same surface:
//   - path     — dotted token path, e.g. "color.primary"
//   - value    — current value (string for color/font/shadow strings; number
//                for numerics; the raw object for nested tokens that the
//                inspector exposes flat keys for)
//   - locked   — whether brand_lock has frozen this path
//   - onChange — optimistic local change; the inspector batches these and
//                posts a single PATCH when the dev saves
//
// Locked state is rendered consistently across controls — opacity 0.5,
// disabled interaction, lock icon with the same tooltip text. The visual
// treatment lives in ThemeInspector.styles.ts, keyed by [data-locked].
/**
 * Heuristic mapping from a token path + current value to a control kind.
 * The Theme Inspector uses this to pick which control to render; the rules
 * below match the keys conventionally used in src/lib/theme.ts.
 */
export function inferControlKind(path, value) {
    const tail = path.split('.').pop() ?? '';
    if (path.startsWith('color') || /(Color|Bg|Fg|Border)$/.test(tail))
        return 'color';
    if (path.startsWith('font') || tail.startsWith('font'))
        return 'font';
    if (path.startsWith('shadow') || tail.toLowerCase().includes('shadow'))
        return 'shadow';
    if (path.startsWith('transition') || /(Duration|Ease|Easing)$/i.test(tail))
        return 'transition';
    if (typeof value === 'number')
        return 'numeric';
    return 'unknown';
}
/**
 * Split a raw value string into `{ value, unit }` for the wire protocol.
 *
 * Used by ThemeInspector.handleChange at the boundary between control
 * `onChange` callbacks (which emit raw strings or numbers) and the wire
 * format (structured deltas). Lives here rather than in ThemeInspector.tsx
 * so the preview client + server-side schema can reuse the same parser if
 * they ever need to (today only the Inspector calls it).
 *
 * Rules:
 *   - Numeric input → { value: number, unit: undefined }
 *   - "8px" / "1.5rem" / "250ms" / "0.8em" → split numeric + unit
 *   - "calc(...)", "cubic-bezier(...)", "var(--…)", "#hex", everything
 *     else → kept as a single string with no unit
 *
 * The supported unit list is intentionally small. Adding more is a one-line
 * regex extension when a new token kind needs one.
 */
export function splitValueUnit(raw) {
    if (typeof raw === 'number')
        return { value: raw };
    const m = /^([-+]?\d*\.?\d+)(px|rem|em|ms|s|%|vh|vw)$/.exec(raw.trim());
    if (m) {
        return { value: parseFloat(m[1]), unit: m[2] };
    }
    return { value: raw };
}
/**
 * Recompose a delta into its display/CSS string form. Inverse of
 * splitValueUnit for values that have a unit; identity for values without.
 * Shared between the preview client (for setProperty) and the server-side
 * ts-morph writer (for setInitializer on numeric tokens).
 */
export function composeDelta(d) {
    return d.unit ? `${d.value}${d.unit}` : String(d.value);
}
//# sourceMappingURL=types.js.map