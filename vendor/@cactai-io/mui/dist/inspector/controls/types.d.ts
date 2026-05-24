export interface BaseControlProps<TValue = unknown> {
    path: string;
    value: TValue;
    locked: boolean;
    onChange: (newValue: TValue) => void;
}
export type ControlKind = 'color' | 'font' | 'numeric' | 'shadow' | 'transition' | 'unknown';
/**
 * Heuristic mapping from a token path + current value to a control kind.
 * The Theme Inspector uses this to pick which control to render; the rules
 * below match the keys conventionally used in src/lib/theme.ts.
 */
export declare function inferControlKind(path: string, value: unknown): ControlKind;
export interface ParsedTheme {
    parsed_tokens: Record<string, unknown>;
    raw_text: string;
    locked_paths: string[];
}
/**
 * A single token-edit delta on the wire.
 *
 * `value` carries the bare value — for colors and fonts, the full string
 * (`"#FF4E6A"`, `"Geist Sans"`); for numerics with a unit, just the number
 * (`8`, `1.5`); for unitless numerics or non-numeric strings, the raw value.
 *
 * `unit` carries the CSS unit suffix when the value has one (`"px"`, `"rem"`,
 * `"ms"`, `"em"`). Omitted for unitless values (colors, font names, raw
 * strings, unitless numbers).
 *
 * Composition rule (used by both the preview client and the server-side
 * ts-morph writer): the on-the-wire format is `value` and `unit` carried
 * separately. The string form that ends up in CSS / the theme.ts file is
 * `${value}${unit ?? ''}`. Storing them separately preserves the unit when
 * the value passes through stringifying intermediaries (postMessage
 * structured clone preserves it, JSON for the PATCH body preserves it,
 * ts-morph's setInitializer takes the recomposed string).
 *
 * Why structured: a previous version of this protocol carried just the value
 * as `unknown`. That coerces `8` (number) and `"8px"` (string) into ambiguous
 * downstream behaviour — the preview would call `setProperty(cssVar, "8")`
 * for a numeric token and silently drop the unit, breaking every numeric
 * token in the inspector. See Phase 9 follow-up.
 */
export interface ThemeDelta {
    value: number | string;
    unit?: string;
}
export interface ThemeDeltas {
    [path: string]: ThemeDelta;
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
export declare function splitValueUnit(raw: number | string): ThemeDelta;
/**
 * Recompose a delta into its display/CSS string form. Inverse of
 * splitValueUnit for values that have a unit; identity for values without.
 * Shared between the preview client (for setProperty) and the server-side
 * ts-morph writer (for setInitializer on numeric tokens).
 */
export declare function composeDelta(d: ThemeDelta): string;
