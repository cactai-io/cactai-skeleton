// packages/mui/src/security/SecurityLayer.ts
// Defense-in-depth security utilities for MUI rendering.
//
// Locked decisions:
// - React elements via react-markdown for streamed text (no innerHTML)
// - DOMPurify for raw HTML artifact content only
// - Sandboxed iframes for Tier 2 generated code, inline for Tier 1
// - Network boundary enforcement in iframes
// - Input gesture verification before GAS dispatch
// - Escalation callback validation
// - API key never enters client bundle (server-side proxy required)
import DOMPurify from 'dompurify';
// Raw HTML sanitization — used ONLY for artifact HTML content.
// Streamed markdown renders through react-markdown (React elements, never innerHTML).
const ALLOWED_TAGS = [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'pre', 'code', 'blockquote', 'em', 'strong', 'br', 'hr',
    'details', 'summary', 'figure', 'figcaption', 'section', 'article',
    'label', 'input', 'select', 'option', 'textarea', 'button',
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g',
];
const ALLOWED_ATTR = [
    'class', 'id', 'style', 'href', 'src', 'alt', 'title', 'role',
    'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
    'aria-expanded', 'aria-selected', 'aria-checked', 'aria-disabled',
    'tabindex', 'type', 'value', 'placeholder', 'name', 'for',
    'width', 'height', 'viewBox', 'xmlns', 'd', 'fill', 'stroke',
    'stroke-width', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'points', 'transform',
];
const FORBID_TAGS = ['script', 'iframe', 'object', 'embed', 'form', 'meta', 'link', 'base'];
const FORBID_ATTR = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
export function sanitizeHTML(dirty) {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        FORBID_TAGS,
        FORBID_ATTR,
        ALLOW_DATA_ATTR: false,
    });
}
// User gesture verification.
// Prevents programmatic input submission from compromised Tier 2 components.
// InputRouter checks this before dispatching to GAS.
let lastGestureTime = 0;
const GESTURE_WINDOW_MS = 2000;
export function recordGesture() {
    lastGestureTime = Date.now();
}
export function isGestureRecent() {
    return Date.now() - lastGestureTime < GESTURE_WINDOW_MS;
}
// Escalation callback validation.
// Strips unexpected fields from onEscalate payloads before forwarding to GAS.
const ALLOWED_ESCALATION_KEYS = new Set([
    'action', 'data', 'artifact_id', 'field_id', 'value', 'selection',
    'confirmed', 'dismissed', 'reason',
]);
export function validateEscalation(payload) {
    if (!payload || typeof payload !== 'object')
        return null;
    const raw = payload;
    const clean = {};
    for (const key of Object.keys(raw)) {
        if (ALLOWED_ESCALATION_KEYS.has(key)) {
            clean[key] = raw[key];
        }
    }
    if (Object.keys(clean).length === 0)
        return null;
    return clean;
}
// Sandboxed iframe creation for Tier 2 generated code.
// Returns an iframe element with strict sandbox attributes.
// No allow-same-origin, no allow-forms, no allow-popups.
// Communication via postMessage only.
export function createSandboxedFrame(code, themeTokensCSS, nonce) {
    const frame = document.createElement('iframe');
    frame.sandbox.add('allow-scripts');
    frame.style.border = 'none';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.display = 'block';
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data: blob:;">`;
    const html = `<!DOCTYPE html>
<html>
<head>${csp}<style>:root{${themeTokensCSS}}*{margin:0;padding:0;box-sizing:border-box;}</style></head>
<body>
<div id="root"></div>
<script nonce="${nonce}">
try{
  // Bridge escalation to parent via postMessage
  window.onEscalate = function(data) {
    window.parent.postMessage({ type: 'mui_escalate', data: data }, '*');
  };
  ${code}
}catch(e){
  window.parent.postMessage({ type: 'mui_render_error', error: e.message }, '*');
}
</script>
</body>
</html>`;
    frame.srcdoc = html;
    return frame;
}
// Generate a cryptographic nonce for CSP
export function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
// Convert ThemeTokens to CSS custom properties string for iframe injection
export function themeToCSS(tokens, prefix = '--gas') {
    const entries = [];
    function walk(obj, path) {
        for (const [key, val] of Object.entries(obj)) {
            const prop = `${path}-${key}`;
            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                walk(val, prop);
            }
            else {
                entries.push(`${prop}:${String(val)}`);
            }
        }
    }
    walk(tokens, prefix);
    return entries.join(';');
}
// Network boundary: validate URLs before proxying to sandboxed iframes
const BLOCKED_PROTOCOLS = ['javascript:', 'data:text/html', 'vbscript:', 'file:'];
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
export function isURLSafe(url) {
    try {
        const parsed = new URL(url);
        if (BLOCKED_PROTOCOLS.some(p => url.toLowerCase().startsWith(p)))
            return false;
        if (BLOCKED_HOSTS.includes(parsed.hostname))
            return false;
        if (parsed.port && !['80', '443', ''].includes(parsed.port))
            return false;
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=SecurityLayer.js.map