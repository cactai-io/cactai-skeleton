// packages/devshell/src/DevShellProvider.tsx
// Dev-shell client. Talks to the Cactai platform API. Renders whatever
// primitive tree the platform sends back. Owns no agent logic.
//
// Distribution model: this file ships in the @cactai-io/devshell package and
// is consumed by the skeleton's /dev/page.tsx stub. The skeleton's stub
// dynamically imports the package only on non-production environments,
// so production builds never load this code.
//
// Caller contract: the consuming page passes user identity, endpoint
// configuration (so the package doesn't reach into the skeleton's @/lib),
// and the developer's preferences URL.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { CactaiClient, ProviderCapabilityError } from '@cactai-io/client';
import { PrimitiveTreeRenderer } from '@cactai-io/primitives';
import { SAMTheme } from '@cactai-io/themes';
import { ProviderKeyModal } from './ProviderKeyModal.js';
export function DevShellProvider({ userId, userEmail, userRole, endpoints, preferencesHref = '/dev/preferences', }) {
    const [client, setClient] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [tree, setTree] = useState(null);
    const [error, setError] = useState(null);
    // Mid-turn capability prompt. When set, a modal is rendered over the
    // current tree so the developer can paste the missing key and continue
    // without losing turn state.
    const [capPrompt, setCapPrompt] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const c = new CactaiClient({
            base_url: endpoints.cactaiBase,
            project_id: endpoints.projectId,
        });
        setClient(c);
        (async () => {
            try {
                const session = await c.openSession({
                    shell: 'dev',
                    user_id: userId,
                    user_email: userEmail,
                    user_role: userRole,
                    viewport: typeof window === 'undefined' ? null : {
                        width: window.screen.width,
                        height: window.screen.height,
                        dpr: window.devicePixelRatio,
                    },
                });
                if (cancelled)
                    return;
                setSessionId(session.session_id);
                setTree(session.initial_tree ?? null);
            }
            catch (err) {
                if (cancelled)
                    return;
                setError(err instanceof Error ? err.message : 'Could not open dev session');
            }
        })();
        return () => { cancelled = true; };
    }, [userId, userEmail, userRole, endpoints.cactaiBase, endpoints.projectId]);
    const postEvent = useCallback(async (target_id, payload) => {
        if (!client || !sessionId)
            return;
        const send = async () => {
            const next = await client.postEvent({ session_id: sessionId, target_id, payload });
            if (next.tree)
                setTree(next.tree);
        };
        try {
            await send();
        }
        catch (err) {
            if (err instanceof ProviderCapabilityError) {
                setCapPrompt({
                    detail: err.detail,
                    retry: async () => { setCapPrompt(null); await send(); },
                });
                return;
            }
            setError(err instanceof Error ? err.message : 'Event delivery failed');
        }
    }, [client, sessionId]);
    if (error) {
        return (_jsx("div", { style: {
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0A0A0F', color: '#E33', fontFamily: 'system-ui', fontSize: 14,
            }, children: error }));
    }
    if (!tree) {
        return (_jsx("div", { style: {
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0A0A0F', color: '#5A5A6E',
                fontFamily: 'Sora, system-ui, sans-serif', fontSize: 13,
            }, children: "Loading\u2026" }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(PrimitiveTreeRenderer, { root: tree, theme: SAMTheme.tokens, postEvent: postEvent }), _jsx("a", { href: preferencesHref, title: "Developer preferences", style: {
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#15151F',
                    border: '1px solid #25253A',
                    borderRadius: '50%',
                    color: '#A0A0B8',
                    fontSize: 16,
                    textDecoration: 'none',
                    zIndex: 9999,
                }, children: "\u2699" }), capPrompt && (_jsx(ProviderKeyModal, { detail: capPrompt.detail, onSaved: capPrompt.retry, onDismiss: () => setCapPrompt(null), endpoints: endpoints }))] }));
}
