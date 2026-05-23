# babel.config.js disabled

v1.3.5 — `babel.config.js` was moved to `babel.config.js.disabled-v1_3_5` so
Next.js uses its default SWC pipeline. The file existed solely to load
`@cactai-io/babel-plugin-source-location`, which injects `data-source-location`
attributes on JSX elements for the DevShell click-to-select feature
(Phase 13, Gap 130).

Keeping the babel config forced Next to use Babel for ALL compilation,
including third-party `node_modules` reached through `transpilePackages`.
That tripped Babel's preset-env on modern Unicode regex patterns
(`/\p{ID_Start}/u`) used by `estree-util-is-identifier-name` (a transitive
dep of `react-markdown` / `remark-gfm` in `@cactai-io/primitives`):

    Error: Failed to recognize value `undefined` for property `ID_Start`.

SWC handles those patterns natively. Moving back to SWC fixes production
builds.

## What's lost

Dev-time click-to-select markers (`data-source-location` attrs) are not
injected. The DevShell viewer overlay's inspect feature falls back to the
React component-display-name path, which is less precise but still
functional.

## Restoring source-location injection

Two paths forward:
1. Author an SWC plugin equivalent of `@cactai-io/babel-plugin-source-location`
   (Rust-based; bigger lift, restores click-to-select precision).
2. Re-enable `babel.config.js` only in dev with a stricter `exclude` rule
   that fully shields all `node_modules` (current `exclude` rule didn't
   intercept the transpilePackages-driven path).
