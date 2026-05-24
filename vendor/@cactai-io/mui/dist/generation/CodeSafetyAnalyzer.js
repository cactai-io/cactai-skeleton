// packages/mui/src/generation/CodeSafetyAnalyzer.ts
// Static-analysis pass over generated code coming back from the Tier 2
// generative fallback. The model is told the rules in the prompt, but the
// only enforcement that matters is what we run after the model returns.
//
// We are NOT trying to be a sandbox. The sandbox is the iframe + CSP that
// SandboxedRenderer wires up at the consumer side. This pass is a fast-fail
// so blatantly dangerous code never even reaches the iframe — defense in
// depth, not the only line of defense.
//
// What we reject:
//   - Calls to eval, Function constructor, or new Function
//   - Outbound network calls (fetch, XMLHttpRequest, WebSocket, navigator.sendBeacon,
//     EventSource, importScripts) — generated code must not phone home or pull
//     remote scripts.
//   - dangerouslySetInnerHTML, innerHTML =, outerHTML = — XSS surface area.
//   - Imports from anything other than 'react' (and React-only deep imports).
//     Generated code is supposed to be self-contained.
//   - postMessage to '*' (the iframe channel uses targeted origins only).
//   - document.cookie reads/writes, localStorage, sessionStorage, indexedDB,
//     navigator.serviceWorker, navigator.geolocation, navigator.clipboard.
//
// Returns { ok: true } if the code passes, otherwise { ok: false, reasons }.
const RULES = [
    // Code execution primitives
    { name: 'eval', pattern: /\beval\s*\(/, reason: 'Use of eval() is not allowed in generated code.' },
    { name: 'Function ctor', pattern: /\bnew\s+Function\s*\(/, reason: 'Dynamic Function construction is not allowed in generated code.' },
    { name: 'Function call expr', pattern: /\bFunction\s*\(\s*['"`]/, reason: 'Dynamic Function() invocation is not allowed in generated code.' },
    { name: 'setTimeout string', pattern: /\bsetTimeout\s*\(\s*['"`]/, reason: 'setTimeout with a string argument compiles to eval and is not allowed.' },
    { name: 'setInterval string', pattern: /\bsetInterval\s*\(\s*['"`]/, reason: 'setInterval with a string argument compiles to eval and is not allowed.' },
    // Network exfiltration / loading
    { name: 'fetch', pattern: /\bfetch\s*\(/, reason: 'fetch() is not allowed in generated code; data must come via props.' },
    { name: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/, reason: 'XMLHttpRequest is not allowed in generated code.' },
    { name: 'WebSocket', pattern: /\bnew\s+WebSocket\s*\(/, reason: 'WebSocket is not allowed in generated code.' },
    { name: 'EventSource', pattern: /\bnew\s+EventSource\s*\(/, reason: 'EventSource is not allowed in generated code.' },
    { name: 'sendBeacon', pattern: /\bnavigator\s*\.\s*sendBeacon\s*\(/, reason: 'navigator.sendBeacon is not allowed in generated code.' },
    { name: 'importScripts', pattern: /\bimportScripts\s*\(/, reason: 'importScripts is not allowed in generated code.' },
    { name: 'dynamic import', pattern: /\bimport\s*\(/, reason: 'Dynamic import() is not allowed in generated code.' },
    // DOM injection
    { name: 'dangerouslySetInnerHTML', pattern: /dangerouslySetInnerHTML/, reason: 'dangerouslySetInnerHTML is not allowed in generated code.' },
    { name: 'innerHTML write', pattern: /\.\s*innerHTML\s*=/, reason: 'innerHTML assignment is not allowed in generated code.' },
    { name: 'outerHTML write', pattern: /\.\s*outerHTML\s*=/, reason: 'outerHTML assignment is not allowed in generated code.' },
    { name: 'document.write', pattern: /\bdocument\s*\.\s*write\s*\(/, reason: 'document.write() is not allowed in generated code.' },
    { name: 'insertAdjacentHTML', pattern: /\.\s*insertAdjacentHTML\s*\(/, reason: 'insertAdjacentHTML is not allowed in generated code.' },
    // Storage / persistence
    { name: 'document.cookie', pattern: /\bdocument\s*\.\s*cookie\b/, reason: 'document.cookie access is not allowed in generated code.' },
    { name: 'localStorage', pattern: /\blocalStorage\b/, reason: 'localStorage access is not allowed in generated code.' },
    { name: 'sessionStorage', pattern: /\bsessionStorage\b/, reason: 'sessionStorage access is not allowed in generated code.' },
    { name: 'indexedDB', pattern: /\bindexedDB\b/, reason: 'indexedDB access is not allowed in generated code.' },
    // Privileged browser APIs
    { name: 'serviceWorker', pattern: /\bnavigator\s*\.\s*serviceWorker\b/, reason: 'Service workers are not allowed in generated code.' },
    { name: 'geolocation', pattern: /\bnavigator\s*\.\s*geolocation\b/, reason: 'Geolocation API is not allowed in generated code.' },
    { name: 'clipboard', pattern: /\bnavigator\s*\.\s*clipboard\b/, reason: 'Clipboard API is not allowed in generated code.' },
    { name: 'getUserMedia', pattern: /\.\s*getUserMedia\s*\(/, reason: 'getUserMedia is not allowed in generated code.' },
    // postMessage targeting — wildcard origin defeats the channel
    { name: 'postMessage *', pattern: /\.\s*postMessage\s*\([^,]+,\s*['"`]\*['"`]/, reason: 'postMessage with a "*" target origin is not allowed.' },
    // window.location navigation away from origin
    { name: 'location.href write', pattern: /\b(?:window|top|parent)\s*\.\s*location\s*(?:\.\s*href\s*)?=/, reason: 'Top-level navigation from generated code is not allowed.' },
    { name: 'location.replace', pattern: /\blocation\s*\.\s*replace\s*\(/, reason: 'location.replace() is not allowed in generated code.' },
    { name: 'location.assign', pattern: /\blocation\s*\.\s*assign\s*\(/, reason: 'location.assign() is not allowed in generated code.' },
    // window.open
    { name: 'window.open', pattern: /\bwindow\s*\.\s*open\s*\(/, reason: 'window.open() is not allowed in generated code.' },
];
/**
 * Scan generated source for forbidden patterns. Returns ok: false with one or
 * more reasons if any rule fires, ok: true otherwise.
 *
 * Notes on the design:
 * - This is a regex pass, not an AST pass. A determined attacker can hide
 *   eval behind string concatenation that defeats regex (e.g. `(0,e[v]+'al')(...)`).
 *   The iframe + CSP at the consumer side is the actual security boundary;
 *   this pass is the cheap pre-filter.
 * - We do not gate on import lists here — a stricter import allowlist belongs
 *   in the bundler/runtime, not in a pre-render check.
 */
export function analyzeGeneratedCode(code) {
    if (!code || typeof code !== 'string') {
        return { ok: false, reasons: ['empty_code'] };
    }
    const reasons = [];
    for (const rule of RULES) {
        if (rule.pattern.test(code)) {
            reasons.push(rule.reason);
        }
    }
    // Cap the size of generated code. Anything truly large is suspicious for a
    // single UI component and also blows up the iframe's bootstrap budget.
    const MAX_SIZE_BYTES = 64 * 1024;
    if (code.length > MAX_SIZE_BYTES) {
        reasons.push(`Generated code exceeds size cap (${code.length} > ${MAX_SIZE_BYTES} bytes).`);
    }
    return reasons.length === 0
        ? { ok: true, reasons: [] }
        : { ok: false, reasons };
}
//# sourceMappingURL=CodeSafetyAnalyzer.js.map