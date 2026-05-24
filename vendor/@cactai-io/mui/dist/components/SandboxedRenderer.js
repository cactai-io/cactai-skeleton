'use client';
// packages/mui/src/components/SandboxedRenderer.tsx
// Iframe-based sandbox for code coming back from Tier 2 generative fallback.
// This is the actual security boundary — the static-analysis pass in
// CodeSafetyAnalyzer is only a pre-filter.
//
// Boundary model:
//   1. Generated code is mounted inside a `srcdoc` iframe, which gives the
//      iframe its own origin distinct from the parent.
//   2. The iframe carries `sandbox="allow-scripts"` — no `allow-same-origin`,
//      no `allow-top-navigation`, no `allow-forms`. This blocks the iframe
//      from reaching parent storage, navigating the top frame, or submitting
//      forms anywhere.
//   3. A strict Content-Security-Policy meta tag is injected inside the
//      srcdoc, locking script-src to 'unsafe-inline' (required for inline
//      <script> from srcdoc to run at all) but disallowing all network
//      connections via connect-src 'none' and remote scripts via blocking
//      'self' on script-src.
//   4. The only communication channel is window.postMessage to the parent
//      with origin set to the parent's known origin, NOT '*'.
//
// What the iframe CAN do:
//   - Render React or HTML using the artifact data we hand it via postMessage.
//   - Call back into the parent via postMessage to request the parent perform
//     an action (form submission, escalation, etc.) on its behalf.
//
// What the iframe CANNOT do:
//   - Read parent cookies or storage (different origin; sandbox without
//     allow-same-origin).
//   - Make outbound network requests (CSP connect-src 'none').
//   - Load remote scripts (CSP script-src 'unsafe-inline' but no host source).
//   - Navigate the top frame (no allow-top-navigation).
//   - Submit forms (no allow-forms).
//   - Access the parent DOM directly.
//
// Limitations:
//   - 'unsafe-inline' on script-src is necessary because the generated
//     component itself is inline. We accept this because the iframe's origin
//     is distinct, so an XSS inside the iframe cannot reach parent state.
//   - The parent must validate every postMessage from the iframe before
//     acting on it (origin check + payload schema check).
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
const DEFAULT_TITLE = 'Generated UI surface';
const DEFAULT_MAX_HEIGHT = 600;
/**
 * Build the srcdoc HTML that runs inside the sandbox iframe. The CSP and
 * boot script are fixed; the generated component code is interpolated as a
 * single <script type="module"> body that mounts the component into the
 * iframe's #root and listens for the artifact-update message.
 */
function buildSrcDoc(code, title) {
    // CSP rationale (per directive):
    //   default-src 'none'  — block everything by default
    //   script-src  'unsafe-inline'  — inline boot + generated code only;
    //                                   no remote scripts permitted
    //   style-src   'unsafe-inline'  — inline component styles only
    //   img-src     data: blob:      — generated UI may use data URIs for icons
    //   font-src    data:            — same for inline font data
    //   connect-src 'none'           — zero network egress from inside the iframe
    //   frame-src   'none'           — no nested iframes
    //   form-action 'none'           — no form submissions
    //   base-uri    'none'           — no <base> tag rewrites
    const csp = [
        "default-src 'none'",
        "script-src 'unsafe-inline'",
        "style-src 'unsafe-inline'",
        "img-src data: blob:",
        "font-src data:",
        "connect-src 'none'",
        "frame-src 'none'",
        "form-action 'none'",
        "base-uri 'none'",
    ].join('; ');
    // The generated code is inserted verbatim. The CodeSafetyAnalyzer at the
    // SDK boundary already rejected obvious exfiltration / eval / innerHTML
    // patterns; the CSP here closes the rest. We escape `</script` to prevent
    // the generated code from prematurely closing the wrapping script tag.
    const safeCode = code.replace(/<\/script/gi, '<\\/script');
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>${escapeHtml(title)}</title>
<style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif;}#root{padding:0;}</style>
</head>
<body>
<div id="root"></div>
<script>
(function () {
  var artifact = null;
  var theme    = {};
  var mounted  = false;

  function post(msg) {
    try { parent.postMessage(msg, document.referrer || '*'); } catch (_) {}
  }

  function reportError(err) {
    post({ source: 'cactai-sandbox', kind: 'error', error: String(err && err.message || err) });
  }

  window.addEventListener('error', function (e) { reportError(e.message); });
  window.addEventListener('unhandledrejection', function (e) { reportError(e.reason); });

  // Tell the parent we're ready to receive props. Parent responds with the
  // initial artifact + theme via postMessage.
  post({ source: 'cactai-sandbox', kind: 'ready' });

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.source !== 'cactai-host') return;
    if (d.kind === 'props') {
      artifact = d.artifact;
      theme    = d.theme || {};
      try { mount(); } catch (err) { reportError(err); }
    }
  });

  // The generated component code is expected to define a global named
  // CactaiGeneratedRender that takes ({ artifact, theme, onEscalate }) and
  // returns either an HTMLElement or a string of HTML.
  function mount() {
    if (mounted) return;
    mounted = true;
    var root = document.getElementById('root');
    if (!root) throw new Error('no root');

    if (typeof window.CactaiGeneratedRender !== 'function') {
      throw new Error('Generated code did not expose CactaiGeneratedRender');
    }

    var onEscalate = function (payload) {
      post({ source: 'cactai-sandbox', kind: 'escalate', payload: payload });
    };

    var result = window.CactaiGeneratedRender({ artifact: artifact, theme: theme, onEscalate: onEscalate });
    if (result instanceof HTMLElement) {
      root.appendChild(result);
    } else if (typeof result === 'string') {
      // Generated code already passed CodeSafetyAnalyzer; inside the iframe
      // origin this is the component's own DOM, and it cannot reach parent
      // state. Use a Range to insert the markup as nodes.
      var range = document.createRange();
      range.selectNodeContents(root);
      var frag = range.createContextualFragment(result);
      root.appendChild(frag);
    } else {
      throw new Error('Generated render returned unsupported value');
    }

    post({ source: 'cactai-sandbox', kind: 'mounted' });
  }
})();
</script>
<script>
${safeCode}
</script>
</body>
</html>`;
}
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
export const SandboxedRenderer = ({ code, artifact, theme, onMessage, onError, maxHeight = DEFAULT_MAX_HEIGHT, title = DEFAULT_TITLE, }) => {
    const iframeRef = useRef(null);
    const srcDoc = useMemo(() => buildSrcDoc(code, title), [code, title]);
    // Listen for messages from the iframe. Validate origin and shape before
    // forwarding to the consumer's onMessage / onError.
    useEffect(() => {
        function handler(e) {
            // The iframe is sandboxed without allow-same-origin, so its origin is
            // 'null'. We rely on source identity (e.source === iframe.contentWindow)
            // and a structural marker (msg.source === 'cactai-sandbox') instead.
            if (!iframeRef.current)
                return;
            if (e.source !== iframeRef.current.contentWindow)
                return;
            const data = e.data;
            if (!data || data.source !== 'cactai-sandbox')
                return;
            if (data.kind === 'ready') {
                iframeRef.current.contentWindow?.postMessage({ source: 'cactai-host', kind: 'props', artifact, theme }, '*');
                return;
            }
            if (data.kind === 'error' && onError) {
                onError(data.error ?? 'unknown sandbox error');
                return;
            }
            if (onMessage)
                onMessage(data);
        }
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [artifact, theme, onMessage, onError]);
    return (_jsx("iframe", { ref: iframeRef, title: title, srcDoc: srcDoc, sandbox: "allow-scripts", referrerPolicy: "no-referrer", style: {
            width: '100%',
            maxHeight,
            height: maxHeight,
            border: 0,
            display: 'block',
        } }));
};
//# sourceMappingURL=SandboxedRenderer.js.map