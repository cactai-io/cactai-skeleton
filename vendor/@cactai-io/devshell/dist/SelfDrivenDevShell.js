// packages/devshell/src/SelfDrivenDevShell.tsx
//
// Phase 1 of the rich-DevShell rollout. Wraps @cactai-io/mui's DevShell
// component so customer apps only need to mount `<SelfDrivenDevShell />`
// with auth + project identity — the wrapper handles MUIShell construction
// and supplies placeholder/empty defaults for the ~30 required panel props.
//
// Why a wrapper instead of refactoring mui's DevShell to be self-fetching
// in-place: mui's DevShell ships to the platform's own dashboard with a
// host that fully wires every prop; rewriting it to fetch internally
// would either break that consumer or fork the component. The wrapper
// pattern lets the prop-driven DevShell stay intact while the
// customer-app code path gets its own self-driven facade.
//
// Phase 1 (this file as it stands): visual chrome renders correctly;
// panels show empty / loading states. The dev can see the IDE shape
// but most surfaces have no data yet.
//
// Phase 2 (next): each placeholder defaultProp gets swapped with a hook
// that fetches from the platform via CactaiClient (through the
// /api/cactai same-origin proxy on the skeleton side). Done panel by
// panel — chat first (already works through MUIShell), then file tree,
// then commits, then skills, then settings.
//
// Phase 3 (after Phase 2): write callbacks (onCommitToDev,
// onSaveCredential, etc.) get wired to skeleton-side action routes
// that use local credentials (GITHUB_TOKEN, SUPABASE_SERVICE_KEY)
// instead of platform-side.
'use client';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { CactaiClient } from '@cactai-io/client';
import { SAMTheme } from '@cactai-io/themes';
import { DevShell, injectDevShellStyles, MUIShell, } from '@cactai-io/mui';
export function SelfDrivenDevShell({ cactaiBase, projectId, projectName = 'App', userId, userEmail, dashboardUrl = 'https://dashboard.cactai.io', }) {
    const [shell, setShell] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [error, setError] = useState(null);
    // Phase 2 — chat wiring. MUIShell's store is the source of truth for
    // agent responses + streaming state. We subscribe in a second effect
    // (after shell is set) and re-derive messages + streamingContent on
    // every store update. User-side messages aren't tracked by MUIStore
    // (the input router dispatches to the platform without first writing
    // a local user-message entry); the chat panel inside DevShell renders
    // user echoes from its own internal state when the input is submitted.
    const [messages, setMessages] = useState([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [agentState, setAgentState] = useState('idle');
    // One-shot session open + MUIShell.init. Runs once on mount per project.
    useEffect(() => {
        injectDevShellStyles();
        let cancelled = false;
        (async () => {
            try {
                const client = new CactaiClient({
                    base_url: cactaiBase,
                    project_id: projectId,
                });
                const session = await client.openSession({
                    shell: 'dev',
                    user_id: userId,
                    user_email: userEmail,
                    viewport: typeof window === 'undefined' ? null : {
                        width: window.screen.width,
                        height: window.screen.height,
                        dpr: window.devicePixelRatio,
                    },
                });
                if (cancelled)
                    return;
                const sid = session.session_id;
                const mui = await MUIShell.init({
                    session_id: sid,
                    project_id: projectId,
                    api_base_url: cactaiBase,
                    platform: 'web',
                    theme: SAMTheme.tokens,
                    skills_packages: [],
                    generation_bounds: { composition_rules: {} },
                    ssr: false,
                });
                // Discard render output for Phase 1 — DevShell renders its own
                // panel tree, MUI's per-turn render callback isn't wired into
                // the rich shell's chat panel yet. Phase 2 hooks DevChatPanel
                // to MUIShell's stream so this becomes meaningful.
                mui.onRender(() => { });
                if (cancelled)
                    return;
                setSessionId(sid);
                setShell(mui);
            }
            catch (err) {
                if (cancelled)
                    return;
                setError(err instanceof Error ? err.message : 'Could not initialize DevShell');
            }
        })();
        return () => { cancelled = true; };
    }, [cactaiBase, projectId, userId, userEmail]);
    // Subscribe to MUIShell store once the shell is ready. The store
    // notifies on every conversation update (agent message append, stream
    // delta, pending toggle). We derive ChatMessage[] from the agent-
    // response log and assemble streamingContent from the delta buffer.
    useEffect(() => {
        if (!shell)
            return;
        const store = shell.getStore();
        const sync = () => {
            const s = store.getState();
            const agentMessages = s.conversation.messages
                .filter(m => m.status === 'complete' && m.output?.text)
                .map(m => ({
                id: m.request_id,
                role: 'agent',
                content: m.output?.text ?? '',
                timestamp: m.completed_at ?? new Date().toISOString(),
            }));
            setMessages(agentMessages);
            setStreamingContent(s.conversation.streaming
                ? s.conversation.stream_buffer.map(d => d.delta).join('')
                : '');
            // Coarse agent-state derivation for the character animation:
            // streaming -> delivering, pending -> thinking, otherwise idle.
            // Phase 3 will read morph_state from the platform's turn-events
            // SSE for finer transitions (executing, awaiting_input).
            const next = s.conversation.streaming
                ? 'delivering'
                : s.conversation.pending
                    ? 'thinking'
                    : 'idle';
            setAgentState(next);
        };
        sync();
        return store.subscribe(sync);
    }, [shell]);
    if (error) {
        return (_jsxs("div", { style: {
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0A0A0F', color: '#E33', fontFamily: 'system-ui', fontSize: 14, padding: 24,
            }, children: ["DevShell failed to open: ", error] }));
    }
    if (!shell || !sessionId) {
        return (_jsx("div", { style: {
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0A0A0F', color: '#5A5A6E',
                fontFamily: 'Sora, system-ui, sans-serif', fontSize: 13,
            }, children: "Loading DevShell\u2026" }));
    }
    // ── Phase 1 placeholders ────────────────────────────────────────────
    // Every required DevShell prop gets a sensible empty default so the
    // visual chrome renders. Each gets replaced with a real fetcher in
    // Phase 2. Comments tag each one with its planned source.
    const developerInitials = userEmail.slice(0, 2).toUpperCase();
    const developerName = userEmail;
    const agentDisplayName = 'Ember'; // Phase 2 (next): read from project personality
    // messages, streamingContent, agentState come from MUIShell store via subscribe effect above.
    const availableRoles = []; // Phase 2 (next): build {role, label, session_id} from tenant_members
    const syncState = { branch: 'dev', synced: true }; // Phase 3: GET /api/git/status
    const pendingFiles = []; // Phase 3: GET /api/git/pending
    const treeNodes = []; // Phase 3: GET /api/git/tree
    const decisions = {}; // Phase 2 (next): GET /api/cactai/v1/projects/:id/workflow
    const backlog = []; // Phase 2 (next): GET /api/cactai/v1/projects/:id/backlog
    const sprints = []; // Phase 2 (next): GET /api/cactai/v1/projects/:id/sprints
    const skills = []; // Phase 2 (next): GET /api/cactai/v1/projects/:id/skills
    return (_jsx(DevShell, { shell: shell, projectId: projectId, projectName: projectName, branch: "dev", syncState: syncState, pendingFiles: pendingFiles, developerInitials: developerInitials, developerName: developerName, agentDisplayName: agentDisplayName, agentState: agentState, messages: messages, streamingContent: streamingContent, availableRoles: availableRoles, apiBaseUrl: cactaiBase, onRoleSwitch: () => { }, onCommitToDev: async () => { }, treeNodes: treeNodes, onFileSelect: () => { }, onExitFileView: () => { }, workflowStep: "purpose_capture", decisions: decisions, backlog: backlog, sprints: sprints, onWorkflowFormSubmit: () => { }, onRevisitDecision: () => { }, onResolveBacklog: () => { }, workspaceProps: {
            onOpenApp: () => { },
        }, buildProps: {
            tools: [],
            onActivateSkill: () => { },
            onDeactivateSkill: () => { },
            onBuildOwn: () => { },
            items: [],
            loading: false,
            searchQuery: '',
            onSearch: () => { },
            onInstall: () => { },
            onUninstall: () => { },
            onPublish: () => { },
            filterKind: 'all',
            onFilterKind: () => { },
        }, skills: skills, schemaProps: {
            tables: [],
            migrations: [],
            onAddTable: () => { },
            onEditTable: () => { },
        }, settingsProps: {
            credentials: {},
            billingEnabled: false,
            collaborators: [],
            onSaveCredential: () => { },
            onInviteCollaborator: () => { },
            onRemoveCollaborator: () => { },
        }, dashboardUrl: dashboardUrl }));
}
