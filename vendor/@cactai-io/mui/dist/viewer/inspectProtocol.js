// packages/mui/src/viewer/inspectProtocol.ts
// postMessage protocol between the DevShell parent + the live preview
// iframe (Gap 134). Defines the wire format, message types, and the
// origin verification helpers both sides use.
//
// Threat model: a malicious site could try to forge inspect events to
// trick DevShell into opening files / leaking source paths. Both sides
// verify the `event.source` matches the expected window and the
// `event.origin` is in the allowed set. Messages without the
// `cactai-inspect:` prefix are ignored, so unrelated postMessage
// traffic on either side stays out of the inspector path.
/** Validate a postMessage event against the configured origin set.
 *  Returns true when the event should be processed. */
export function isAcceptableOrigin(origin, options) {
    if (!origin)
        return false;
    if (origin === options.parentOrigin)
        return true;
    for (const allowed of options.allowedOrigins) {
        if (origin === allowed)
            return true;
        // Allow Vercel preview URL wildcards: `https://app-xxx.vercel.app`
        // matches the registered project + any deployment id.
        if (allowed.includes('*') && originMatchesWildcard(origin, allowed))
            return true;
    }
    return false;
}
function originMatchesWildcard(origin, pattern) {
    // Convert pattern to a regex: 'https://*.vercel.app' →
    // /^https:\/\/[^.]+\.vercel\.app$/
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+');
    const re = new RegExp(`^${escaped}$`);
    return re.test(origin);
}
// ── Type guards for inbound messages ────────────────────────────────────
export function isInspectMessage(data) {
    return !!data
        && typeof data === 'object'
        && 'type' in data
        && typeof data.type === 'string'
        && data.type.startsWith('cactai-inspect:');
}
export function isIframeToParent(data) {
    if (!isInspectMessage(data))
        return false;
    const t = data.type;
    return t === 'cactai-inspect:ready'
        || t === 'cactai-inspect:hover'
        || t === 'cactai-inspect:select'
        || t === 'cactai-inspect:no-match';
}
export function isParentToIframe(data) {
    if (!isInspectMessage(data))
        return false;
    const t = data.type;
    return t === 'cactai-inspect:enable'
        || t === 'cactai-inspect:disable'
        || t === 'cactai-inspect:ping';
}
//# sourceMappingURL=inspectProtocol.js.map