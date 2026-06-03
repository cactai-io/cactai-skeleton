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
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { CactaiClient, ProviderCapabilityError } from '@cactai-io/client';
import { PrimitiveTreeRenderer } from '@cactai-io/primitives';
import { SAMTheme } from '@cactai-io/themes';
import { DevShell, injectDevShellStyles, MUIShell, MCP_CATALOGS, MCP_EXPLAINERS, OnboardingModal, GuidePanel, UpdateAvailableModal, WorkflowCompletionModal, } from '@cactai-io/mui';
import { ProviderKeyModal } from './ProviderKeyModal.js';
export function SelfDrivenDevShell({ cactaiBase, projectId, projectName = 'App', userId, userEmail, userRole, dashboardUrl = 'https://dashboard.cactai.io', productionUrl, }) {
    const [shell, setShell] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [error, setError] = useState(null);
    // The CactaiClient instance + the platform-emitted primitive tree.
    // initial_tree from openSession seeds this; postEvent responses
    // replace it as the orchestrator advances build_phase / current_step
    // / build_approval / etc. PrimitiveTreeRenderer (mounted inside the
    // Build tab's post-workflow slot — see DevShell.tsx) renders this
    // through the existing skill component registry, restoring access to
    // PurposeCapture, PurposeConfirm, PurposeClarify, StageStep (with its
    // 24 specialized step renderers), BuildApproval, and BuildProgress.
    const [client, setClient] = useState(null);
    const [primitiveTree, setPrimitiveTree] = useState(null);
    // Mid-turn provider-capability prompt. Set when postEvent throws a
    // ProviderCapabilityError (the platform discovered mid-turn that a
    // required provider key isn't configured for this project). Renders
    // ProviderKeyModal over the current tree; the developer pastes a key
    // and the original event retries without losing state.
    const [capPrompt, setCapPrompt] = useState(null);
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
    // Phase 2b — workflow state from the platform. Polls every 5s while
    // DevShell is mounted so agent-side changes (purpose recorded, plan
    // approved, sprint started, backlog item added) surface in the rail
    // without manual refresh. The endpoint is server-side + bearer-gated;
    // the proxy handles auth.
    const [workflowStep, setWorkflowStep] = useState('name_and_intent');
    const [decisions, setDecisions] = useState({});
    const [backlog, setBacklog] = useState([]);
    // Active form spec for the current workflow step. Sourced from the
    // platform's /v1/projects/:id/devshell/workflow poll, which reads the
    // step from STEP_REGISTRY. Plan view's WorkflowSurface renders this
    // through DecisionInput when set. Same data the chat panel renders via
    // PrimitiveNode → MUIShell, just surfaced in the structured view too.
    const [workflowForm, setWorkflowForm] = useState(null);
    // Top-rank role name (e.g. 'super_admin' or whatever the developer
    // renamed it) + whether the app's signup mode auto-promotes the
    // first signup. Used to gate the workflow-completion modal's
    // role-claim section. Both come from /api/workflow/state.
    const [topRankRoleName, setTopRankRoleName] = useState(null);
    const [autoPromoteOnFirstSignup, setAutoPromoteOnFirstSignup] = useState(false);
    const [sprints, setSprints] = useState([]);
    // Plan-view notes — free-form project markdown + per-decision threads.
    // Backed by /api/workflow/notes (stored under project_state.decisions._notes).
    const [projectNotes, setProjectNotes] = useState('');
    const [decisionNotes, setDecisionNotes] = useState({});
    // Phase 3a — file tree from the customer's GitHub repo via skeleton-
    // side /api/git/tree (uses GITHUB_TOKEN server-side). Loaded once on
    // mount; refreshed after each commit.
    const [treeNodes, setTreeNodes] = useState([]);
    const [activeFilePath, setActiveFilePath] = useState(undefined);
    const [fileContent, setFileContent] = useState(null);
    const [fileLoading, setFileLoading] = useState(false);
    // Phase 3b-2 — pending edits from the customer DB pending_files table
    // via /api/git/pending. Polled every 4s so the file tree's modified
    // dots + the pending-edits modal stay in sync with the agent's
    // staging-layer writes. Commits are batched server-side (the route
    // reads current_content from pending_files per path) so the wrapper
    // never needs to ferry blob bytes through the browser.
    const [pendingFiles, setPendingFiles] = useState([]);
    // Phase 3d — customer DB schema introspection. Loaded once on mount;
    // not polled because schema rarely changes mid-session and the agent
    // would surface a refresh prompt when migrations land.
    const [schemaTables, setSchemaTables] = useState([]);
    const [migrations, setMigrations] = useState([]);
    const [supabaseProjectUrl, setSupabaseProjectUrl] = useState(undefined);
    const [fetchErrors, setFetchErrors] = useState({});
    // Record (or clear) a fetch error and emit a single console.warn line
    // so the customer-app browser console shows what failed. Stable
    // identity so effects can include it in dep arrays without re-firing.
    const recordFetchError = React.useRef((source, err) => {
        if (err === null) {
            setFetchErrors(prev => {
                if (!prev[source])
                    return prev;
                const next = { ...prev };
                delete next[source];
                return next;
            });
            return;
        }
        const entry = { source, when: new Date().toISOString(), ...err };
        setFetchErrors(prev => ({ ...prev, [source]: entry }));
        console.warn(`[DevShell] ${source} fetch failed` +
            (err.status ? ` (HTTP ${err.status})` : '') +
            (err.code ? ` [${err.code}]` : '') +
            (err.detail ? `: ${err.detail}` : ''));
    }).current;
    const [byok, setByok] = useState(null);
    const [personality, setPersonality] = useState(null);
    const [workflowSettings, setWorkflowSettings] = useState(null);
    const [capabilityConfig, setCapabilityConfig] = useState(null);
    const [capabilityCat, setCapabilityCat] = useState([]);
    const [credentialsState, setCredentialsState] = useState(null);
    // MCP — devshell-scope integrations for this project. Sprint-1 UI:
    // persisted via /v1/projects/:id/mcp/devshell but inert (no agent
    // usage yet). See memory: mcp-integration-architecture.
    const [mcpServers, setMcpServers] = useState([]);
    const [mcpLoading, setMcpLoading] = useState(true);
    // Tracks whether we've already reconciled the local SkillRegistry's
    // active flags against persisted capability_config_v2.appshell. Done
    // once per (shell, config) pair so refresh doesn't fight in-session
    // toggle changes.
    const registryReconciled = React.useRef(null);
    // One-shot session open + MUIShell.init. Runs once on mount per project.
    useEffect(() => {
        injectDevShellStyles();
        let cancelled = false;
        (async () => {
            try {
                const c = new CactaiClient({
                    base_url: cactaiBase,
                    project_id: projectId,
                });
                const session = await c.openSession({
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
                    // Identifies the operator for per-turn server-side handling
                    // (turn submission requires user_id, embedding ctx per-user,
                    // capability scoping). The session already has it; pass it
                    // explicitly so InputRouter doesn't have to re-derive on
                    // every dispatch.
                    end_user_id: userId,
                    role: userRole,
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
                setClient(c);
                // Seed the platform-emitted primitive tree with whatever the
                // DevShell Orchestrator produced for this project's current
                // build_phase. On first open this is the purpose_capture
                // welcome surface; on resume it's whatever phase/step the
                // project's last session left off at.
                if (session.initial_tree)
                    setPrimitiveTree(session.initial_tree);
            }
            catch (err) {
                if (cancelled)
                    return;
                setError(err instanceof Error ? err.message : 'Could not initialize DevShell');
            }
        })();
        return () => { cancelled = true; };
    }, [cactaiBase, projectId, userId, userEmail]);
    // postEvent — primary handler for events posted by primitive
    // components (purpose_capture submit, stage_step select, etc.). Posts
    // through to the DevShell Orchestrator via /v1/shell/event using the
    // registered target_id from the event-targets registry (populated when
    // openSession returned the initial tree). The response carries the
    // next primitive tree which replaces the current one. Mid-turn
    // capability errors (missing provider key) get caught and surface the
    // ProviderKeyModal — the developer pastes a key, the modal saves it,
    // the original event retries without losing the orchestrator state.
    const postEvent = useCallback(async (target_id, payload) => {
        if (!client || !sessionId)
            return;
        const send = async () => {
            const next = await client.postEvent({ session_id: sessionId, target_id, payload });
            if (next.tree)
                setPrimitiveTree(next.tree);
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
    // Reconcile the local SkillRegistry against persisted appshell
    // capability_config once both are loaded. Without this step, the
    // BuildPanel's "active" badge starts blank on every page refresh
    // because MUIShell.init only seeds active flags from SDK defaults —
    // it has no knowledge of the customer's persisted preferences.
    // Reconciliation walks the catalogue: every skill that's enabled
    // in appshell.enabled gets activated locally; others get deactivated.
    // The defaults_by_category map wins ties when multiple skills share
    // an artifact_type (it pins one as the canonical default).
    useEffect(() => {
        if (!shell || !capabilityConfig)
            return;
        // Idempotency: re-run when either the shell instance or the config
        // identity changes, but not on every state tick.
        const sig = registryReconciled.current;
        if (sig && sig.shell === shell && sig.configRev === capabilityConfig)
            return;
        const appshell = capabilityConfig.appshell ?? { enabled: {}, defaults_by_category: {} };
        const enabledMap = appshell.enabled ?? {};
        const defaultsMap = appshell.defaults_by_category ?? {};
        // Phase 1: apply explicit enables/disables. Skip items the developer
        // hasn't touched (no entry in enabled map) — those follow SDK defaults
        // already set by MUIShell.init.
        for (const [id, enabled] of Object.entries(enabledMap)) {
            if (enabled)
                shell.activateSkill(id);
            else
                shell.deactivateSkill(id);
        }
        // Phase 2: pin each category's default. activateSkill auto-
        // deactivates siblings of the same artifact_type, so this only
        // matters when multiple skills share a type AND the developer
        // wants a specific one as canonical.
        for (const defaultId of Object.values(defaultsMap)) {
            if (typeof defaultId === 'string' && defaultId)
                shell.activateSkill(defaultId);
        }
        registryReconciled.current = { shell, configRev: capabilityConfig };
    }, [shell, capabilityConfig]);
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
    // Poll workflow state from the platform. Same-origin fetch
    // through /api/cactai → platform's /v1/projects/:id/devshell/workflow.
    // 5s cadence is a deliberate compromise: agent-side changes surface
    // within a sprint cycle without hammering the customer DB. A future
    // SSE channel would replace polling, but isn't needed yet.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const res = await fetch(`${cactaiBase.replace(/\/$/, '')}/v1/projects/${projectId}/devshell/workflow`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    cache: 'no-store',
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    recordFetchError('workflow', { status: res.status, code: body.error, detail: body.detail });
                    return;
                }
                const body = await res.json();
                if (cancelled)
                    return;
                setWorkflowStep(body.workflow_step);
                setDecisions(body.decisions ?? {});
                setSprints(body.sprints ?? []);
                setBacklog(body.backlog ?? []);
                setWorkflowForm(body.active_form ?? null);
                setTopRankRoleName(body.top_rank_role_name ?? null);
                setAutoPromoteOnFirstSignup(!!body.auto_promote_on_first_signup);
                recordFetchError('workflow', null);
            }
            catch (err) {
                recordFetchError('workflow', { detail: err.message });
            }
        };
        void tick();
        const interval = setInterval(tick, 5000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [cactaiBase, projectId, recordFetchError]);
    // File tree: fetched once on mount. The skeleton route hits GitHub's
    // trees API server-side with GITHUB_TOKEN, so no credential ever
    // reaches the browser. Branch defaults to 'dev'.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch('/api/git/tree?branch=dev', { cache: 'no-store' });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    recordFetchError('tree', { status: res.status, code: body.error, detail: body.detail });
                    return;
                }
                const body = await res.json();
                if (!cancelled) {
                    setTreeNodes(body.tree ?? []);
                    recordFetchError('tree', null);
                }
            }
            catch (err) {
                recordFetchError('tree', { detail: err.message });
            }
        })();
        return () => { cancelled = true; };
    }, [recordFetchError]);
    const onFileSelect = async (path) => {
        setActiveFilePath(path);
        setFileLoading(true);
        setFileContent(null);
        try {
            const res = await fetch(`/api/git/file?branch=dev&path=${encodeURIComponent(path)}`, {
                cache: 'no-store',
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                recordFetchError('file', { status: res.status, code: body.error, detail: body.detail });
                setFileContent(`// Could not load ${path} (HTTP ${res.status})${body.detail ? `\n// ${body.detail}` : ''}`);
                return;
            }
            const body = await res.json();
            setFileContent(body.content ?? '');
            recordFetchError('file', null);
        }
        catch (e) {
            recordFetchError('file', { detail: e.message });
            setFileContent(`// Could not load ${path}: ${e.message}`);
        }
        finally {
            setFileLoading(false);
        }
    };
    const onExitFileView = () => {
        setActiveFilePath(undefined);
        setFileContent(null);
    };
    // Pending files — poll every 4s.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const res = await fetch('/api/git/pending', { cache: 'no-store' });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    recordFetchError('pending', { status: res.status, code: body.error, detail: body.detail });
                    return;
                }
                const body = await res.json();
                if (cancelled)
                    return;
                setPendingFiles(body.files ?? []);
                recordFetchError('pending', null);
            }
            catch (err) {
                recordFetchError('pending', { detail: err.message });
            }
        };
        void tick();
        const interval = setInterval(tick, 4000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [recordFetchError]);
    // Customer DB schema — fetched once on mount. The skeleton route uses
    // SUPABASE_DATABASE_URL server-side to introspect information_schema +
    // pg_constraint directly (not the Supabase REST API, which doesn't
    // expose information_schema). Migrations come from
    // supabase_migrations.schema_migrations when present.
    // supabase_project_url is the Supabase dashboard deep-link for the
    // SchemaPanel's "Open in Supabase ↗" affordance.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch('/api/db/schema', { cache: 'no-store' });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    recordFetchError('schema', { status: res.status, code: body.error, detail: body.detail });
                    return;
                }
                const body = await res.json();
                if (cancelled)
                    return;
                setSchemaTables(body.tables ?? []);
                setMigrations(body.migrations ?? []);
                if (body.supabase_project_url)
                    setSupabaseProjectUrl(body.supabase_project_url);
                recordFetchError('schema', null);
            }
            catch (err) {
                recordFetchError('schema', { detail: err.message });
            }
        })();
        return () => { cancelled = true; };
    }, [recordFetchError]);
    // Marketplace browse + install fetches removed per sprint-prioritization
    // memo. The platform endpoints (/v1/marketplace, /v1/installs,
    // POST/DELETE /v1/marketplace/:id/install) remain in place server-side
    // so reintroduction is a wrapper change + a single BuildPanel prop —
    // no schema or contract work needed when MCP ships and we revisit
    // marketplace. The BuildPanel renders Installed-only without these.
    // Settings panel data — per-source, polled every 10s. Each surface
    // (byok, personality, workflow, capabilities, credentials) is
    // fetched directly from the skeleton's /api/settings/* routes which
    // already return panel-correct shapes (ProjectBYOKResponse,
    // ProjectPersonalityResponse, etc.). One failing source doesn't
    // poison the others — each gets its own diagnostics entry.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            const settle = async (url, source) => {
                try {
                    const res = await fetch(url, { cache: 'no-store' });
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        recordFetchError(source, { status: res.status, code: body.error, detail: body.detail });
                        return null;
                    }
                    recordFetchError(source, null);
                    return await res.json();
                }
                catch (err) {
                    recordFetchError(source, { detail: err.message });
                    return null;
                }
            };
            const [byokBody, personalityBody, workflowBody, capsBody, credsBody, platformSettings] = await Promise.all([
                settle('/api/settings/byok', 'byok'),
                settle('/api/settings/personality', 'personality'),
                settle('/api/settings/workflow', 'workflow_settings'),
                settle('/api/settings/capabilities', 'capabilities'),
                settle('/api/settings/credentials', 'credentials'),
                // Keep the platform call only for the credentials *_set flags
                // — the skeleton's /credentials route doesn't surface them in
                // that shape today, and the platform endpoint already gates by
                // project scope. Migration to a single skeleton source is a
                // follow-up; both reads are cheap.
                settle(`${cactaiBase.replace(/\/$/, '')}/v1/projects/${projectId}/devshell/settings`, 'settings'),
            ]);
            if (cancelled)
                return;
            if (byokBody)
                setByok(byokBody);
            if (personalityBody)
                setPersonality(personalityBody);
            if (workflowBody)
                setWorkflowSettings(workflowBody);
            if (capsBody) {
                setCapabilityCat(capsBody.catalogue ?? []);
                setCapabilityConfig(capsBody.config ?? null);
            }
            // Prefer the skeleton-side credentials shape when present;
            // fall back to the platform's *_set flags so the panel can
            // still render badges in the meantime.
            const credsResolved = credsBody?.credentials
                ?? platformSettings?.credentials
                ?? null;
            if (credsResolved)
                setCredentialsState(credsResolved);
        };
        void tick();
        const interval = setInterval(tick, 10000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [cactaiBase, projectId, recordFetchError]);
    // MCP devshell-scope servers — fetched once on mount. Sprint-1 UI:
    // these persist but are inert (no orchestrator / agent yet).
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch(`${cactaiBase.replace(/\/$/, '')}/v1/projects/${projectId}/mcp/devshell`, { cache: 'no-store' });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    recordFetchError('mcp', { status: res.status, code: body.error, detail: body.detail });
                    return;
                }
                const body = await res.json();
                if (cancelled)
                    return;
                setMcpServers(body.servers ?? []);
                recordFetchError('mcp', null);
            }
            catch (err) {
                recordFetchError('mcp', { detail: err.message });
            }
            finally {
                if (!cancelled)
                    setMcpLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [cactaiBase, projectId, recordFetchError]);
    // Onboarding modal state. Opens on first DevShell mount per project
    // (localStorage gated; project-scoped key). Persistent re-entry via
    // a custom event the IDE shell can dispatch.
    //
    // HOOK ORDERING: these hooks (plus the welcome-chat-seed effect below)
    // MUST live above the `if (error)` / `if (!shell)` early returns.
    // Placing them below caused React error #310 — on render 1 the bail
    // returned before these hooks ran, on render 2 (after shell init)
    // they ran for the first time, and React's hooks counter saw a
    // different hook count between renders. Introduced in 6c4d009 and
    // fixed by relocating the block above the returns.
    const onboardingKey = `cactai_onboarding_seen_${projectId}`;
    const [onboardingOpen, setOnboardingOpen] = useState(typeof window !== 'undefined'
        ? !window.localStorage.getItem(onboardingKey)
        : false);
    const dismissOnboarding = () => {
        setOnboardingOpen(false);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(onboardingKey, new Date().toISOString());
        }
    };
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const handler = () => setOnboardingOpen(true);
        window.addEventListener('cactai:onboarding:open', handler);
        return () => window.removeEventListener('cactai:onboarding:open', handler);
    }, []);
    // ⓘ-guide controller. One guide is open at a time; its `origin` (carried in
    // the fetched content) decides which container it animates into — chat slot
    // for top/right surfaces, files panel for bottom. Content comes from the
    // platform's per-surface guide endpoint so copy updates ship with a platform
    // deploy and reach every customer app on the next request — no rebuild, same
    // model as the welcome seed. The first-run welcome (OnboardingModal
    // mode='modal') stays separate; this replaces the old docked OnboardingModal.
    const [guide, setGuide] = useState(null);
    const openGuide = useCallback((surface) => {
        setGuide({ surface, content: null, loading: true });
        void (async () => {
            // Resolve the personality display name at call time from `personality`
            // state (declared above the early returns). agentDisplayName itself is
            // computed below the early returns, so it can't be captured by a hook up
            // here without a TDZ — this mirrors that same derivation.
            const overrideId = typeof window !== 'undefined'
                ? (window.localStorage.getItem('cactai_devshell_personality') ?? undefined)
                : undefined;
            const id = overrideId ?? personality?.active_id;
            const ap = id ? personality?.available.find(p => p.id === id) : undefined;
            const name = ap?.display_name ?? (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Ember');
            try {
                const base = cactaiBase.replace(/\/$/, '');
                const wf = workflowStep === 'complete' ? '&workflow_complete=1' : '';
                const res = await fetch(`${base}/v1/projects/${projectId}/devshell/guide?surface=${encodeURIComponent(surface)}&personality_name=${encodeURIComponent(name)}${wf}`, { cache: 'no-store' });
                if (!res.ok) {
                    setGuide(null);
                    return;
                }
                const content = await res.json();
                // Ignore a stale resolve if the developer reopened a different surface
                // while this fetch was in flight.
                setGuide(g => (g && g.surface === surface ? { surface, content, loading: false } : g));
            }
            catch {
                setGuide(null);
            }
        })();
    }, [cactaiBase, projectId, personality, workflowStep]);
    const closeGuide = useCallback(() => setGuide(null), []);
    // Workflow-completion modal state. Fires once when workflow_step
    // transitions to 'complete'. localStorage gates a re-trigger so a
    // refresh after dismissal doesn't bring it back.
    const completionKey = `cactai_workflow_complete_seen_${projectId}`;
    const [completionOpen, setCompletionOpen] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        if (workflowStep !== 'complete')
            return;
        if (window.localStorage.getItem(completionKey))
            return;
        setCompletionOpen(true);
    }, [workflowStep, completionKey]);
    const dismissCompletion = () => {
        setCompletionOpen(false);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(completionKey, new Date().toISOString());
        }
    };
    // Platform update status. Polled from /api/devshell/update/check on
    // mount and every 5 minutes thereafter. The UpdateAvailableModal opens
    // when the developer clicks the workspace-panel "Updates available"
    // pill, and the apply handler hits POST /api/devshell/update which
    // returns the opened PR URL on success. Update content is platform-
    // owned (see apps/api/src/devshell/update-service/) so the customer
    // app doesn't need a rebuild to surface this affordance — only the
    // skeleton-side proxy routes have to exist.
    const [updateStatus, setUpdateStatus] = useState(null);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const res = await fetch('/api/devshell/update/check');
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (cancelled)
                    return;
                setUpdateStatus({
                    has_update: !!data.has_update,
                    current_platform_sha: data.current_platform_sha ?? null,
                    latest_platform_sha: data.latest_platform_sha,
                });
            }
            catch {
                // Non-fatal — leave updateStatus as-is.
            }
        };
        void tick();
        const interval = setInterval(() => { void tick(); }, 5 * 60 * 1000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);
    // App role catalog (customer DB tenant_roles_catalog) for the App
    // Configuration → Roles tab. Read once; edits PUT back + update locally.
    const [roleCatalog, setRoleCatalog] = useState(undefined);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/devshell/roles');
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data.roles))
                    setRoleCatalog(data.roles);
            }
            catch {
                // Non-fatal — Roles tab falls back to the seed-default preview.
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const onRolePatch = async (patch) => {
        const res = await fetch('/api/devshell/roles', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (res.ok) {
            setRoleCatalog(prev => prev?.map(r => r.role === patch.role ? { ...r, ...patch } : r));
        }
        else {
            const body = await res.json().catch(() => ({}));
            recordFetchError('role_save', { status: res.status, code: body.error, detail: body.detail });
        }
    };
    // Per-agent enable/disable overrides (customer DB app_agent_config) for
    // the App Configuration → Agents tab. Sparse map; absent = enabled.
    const [agentConfig, setAgentConfig] = useState(undefined);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/devshell/agents');
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (!cancelled && data.config)
                    setAgentConfig(data.config);
            }
            catch {
                // Non-fatal — Agents tab defaults everything to enabled.
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const onAgentToggle = async (agentId, enabled) => {
        setAgentConfig(prev => ({ ...(prev ?? {}), [agentId]: enabled }));
        const res = await fetch('/api/devshell/agents', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_id: agentId, enabled }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            recordFetchError('agent_save', { status: res.status, code: body.error, detail: body.detail });
        }
    };
    // AI keys policy + per-provider budgets (customer DB app_ai_keys_policy +
    // app_provider_policy) for the App Configuration → AI tab.
    const [aiPolicy, setAiPolicy] = useState(undefined);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/devshell/ai-policy');
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (!cancelled && data && typeof data.global_policy === 'string')
                    setAiPolicy(data);
            }
            catch {
                // Non-fatal — AI tab defaults to BYOK with no overrides.
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const onAIPolicyPatch = async (patch) => {
        // Optimistic local merge so the prop stays in step with the edit.
        setAiPolicy(prev => {
            const base = prev ?? { global_policy: 'byok', providers: {} };
            const next = { global_policy: base.global_policy, providers: { ...base.providers } };
            if (patch.global_policy)
                next.global_policy = patch.global_policy;
            if (patch.provider) {
                const pv = patch.provider;
                const cur = next.providers[pv.provider_id] ?? { policy: null, budget: null, team_keys: false };
                next.providers[pv.provider_id] = {
                    policy: 'policy' in pv ? (pv.policy ?? null) : cur.policy,
                    budget: 'budget' in pv ? (pv.budget ?? null) : cur.budget,
                    team_keys: 'team_keys' in pv ? !!pv.team_keys : cur.team_keys,
                };
            }
            return next;
        });
        const res = await fetch('/api/devshell/ai-policy', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            recordFetchError('ai_policy_save', { status: res.status, code: body.error, detail: body.detail });
        }
    };
    // Tiers + per-tier per-provider budgets (customer DB app_tiers +
    // app_tier_budgets) for the App Configuration → Tiers tab.
    const [tiers, setTiers] = useState(undefined);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/devshell/tiers');
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data.tiers))
                    setTiers(data.tiers);
            }
            catch {
                // Non-fatal — Tiers tab falls back to the default preview.
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const onTierBudgetPatch = async (patch) => {
        setTiers(prev => prev?.map(t => t.tier_id === patch.tier_id
            ? { ...t, budgets: { ...t.budgets, [patch.provider_id]: patch.budget } }
            : t));
        const res = await fetch('/api/devshell/tiers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            recordFetchError('tier_save', { status: res.status, code: body.error, detail: body.detail });
        }
    };
    // Devshell-scope MCP handlers — shared by App Configuration's Integrations
    // tab AND the DevShell Configuration Integrations tab. Both write through
    // /v1/projects/:id/mcp/devshell.
    const mcpBase = `${cactaiBase.replace(/\/$/, '')}/v1/projects/${projectId}/mcp/devshell`;
    const onMCPAdd = async (input) => {
        const res = await fetch(mcpBase, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
        if (!res.ok) {
            const b = await res.json().catch(() => ({}));
            recordFetchError('mcp_add', { status: res.status, code: b.error, detail: b.detail });
            return;
        }
        recordFetchError('mcp_add', null);
        const b = await res.json();
        setMcpServers(prev => [...prev, b.server]);
    };
    const onMCPRemove = async (id) => {
        const res = await fetch(`${mcpBase}/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const b = await res.json().catch(() => ({}));
            recordFetchError('mcp_remove', { status: res.status, code: b.error, detail: b.detail });
            return;
        }
        recordFetchError('mcp_remove', null);
        setMcpServers(prev => prev.filter(s => s.id !== id));
    };
    const onMCPToggle = async (id, enabled) => {
        setMcpServers(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
        const res = await fetch(`${mcpBase}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
        if (!res.ok) {
            setMcpServers(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
            const b = await res.json().catch(() => ({}));
            recordFetchError('mcp_toggle', { status: res.status, code: b.error, detail: b.detail });
        }
        else {
            recordFetchError('mcp_toggle', null);
        }
    };
    // Library uploads (customer DB app_assets) — developer-brought files indexed
    // in the Library directory.
    const [assets, setAssets] = useState([]);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/devshell/assets');
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data.assets))
                    setAssets(data.assets);
            }
            catch {
                // Non-fatal — the Library just omits the uploads.
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const onUploadAsset = async (file) => {
        const res = await fetch('/api/devshell/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(file),
        });
        if (res.ok) {
            const data = await res.json();
            if (data.asset)
                setAssets(prev => [data.asset, ...prev]);
        }
        else {
            const body = await res.json().catch(() => ({}));
            recordFetchError('asset_upload', { status: res.status, code: body.error, detail: body.detail });
        }
    };
    const onDeleteAsset = async (id) => {
        setAssets(prev => prev.filter(a => a.id !== id));
        const res = await fetch(`/api/devshell/assets/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            recordFetchError('asset_delete', { status: res.status, code: body.error, detail: body.detail });
        }
    };
    const assetDownloadPath = (id) => `/api/devshell/assets/${id}/download`;
    // Load Plan-view notes once on mount. Notes live under
    // project_state.decisions._notes; /api/workflow/notes returns the blob.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/workflow/notes');
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (cancelled)
                    return;
                if (typeof data.project === 'string')
                    setProjectNotes(data.project);
                if (data.decisions)
                    setDecisionNotes(data.decisions);
            }
            catch {
                // Non-fatal — notes panel renders empty.
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const applyUpdate = async () => {
        try {
            const res = await fetch('/api/devshell/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
                // Refresh the check so the badge disappears once the PR is open.
                // The developer still has to merge the PR for the platform_sha to
                // advance, but the badge is intentionally a "tracked" indicator —
                // we hide it as soon as a PR is opened so the affordance doesn't
                // re-spam the developer mid-review.
                setUpdateStatus(prev => prev ? { ...prev, has_update: false } : prev);
            }
            return data;
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    };
    // (Welcome chat-message seeding was here as a stopgap while
    // PrimitiveTreeRenderer wasn't wired. Now that openSession's
    // initial_tree flows into <PrimitiveTreeRenderer> inside the Build
    // tab, the original PurposeCaptureComponent renders the welcome
    // surface natively — no client-side message injection needed. The
    // /api/devshell/welcome endpoint stays available for any future
    // surface that wants the raw content but is no longer the rendering
    // path. Same outcome from the developer's perspective: see the
    // welcome on first open, see the rest of the workflow after submit.)
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
    // Resolve agent display name + character from the project's active
    // personality. Falls back to 'Ember' for the name when personality
    // data hasn't arrived yet OR the active id doesn't match any
    // available record.
    //
    // Character mapping (id → SVG + animation classes) mirrors
    // @cactai-io/personalities' CHARACTERS map, replicated inline here
    // to avoid taking a Cactai-IP dep in the customer-distributed
    // devshell wrapper. svg_ids match CharacterRenderer's CHARACTER_MAP
    // ('robot' / 'prairie-dog' / 'owl'); animation class names match the
    // CSS keyframes in DevShellStyles.
    const BUILTIN_CHARACTERS = {
        sam: { svg_id: 'robot', idle_animation: 'ds-anim-robot-idle', thinking_animation: 'ds-anim-robot-think', waiting_animation: 'ds-anim-robot-wait', responding_animation: 'ds-anim-robot-respond' },
        milo: { svg_id: 'prairie-dog', idle_animation: 'ds-anim-prairie-dog-idle', thinking_animation: 'ds-anim-prairie-dog-think', waiting_animation: 'ds-anim-prairie-dog-wait', responding_animation: 'ds-anim-prairie-dog-respond' },
        ember: { svg_id: 'owl', idle_animation: 'ds-anim-owl-idle', thinking_animation: 'ds-anim-owl-think', waiting_animation: 'ds-anim-owl-wait', responding_animation: 'ds-anim-owl-respond' },
    };
    // Chat header personality — reads from DevShell-scope storage when set
    // (localStorage key cactai_devshell_personality, set by the DevShell
    // Configuration → Preferences tab), falls back to the app-scope active
    // personality, falls back to Ember. The chat-header agent name +
    // character represent the DEVELOPER'S build-time agent, not the
    // deployed app's end-user agent — so the DevShell-scope override wins.
    const devshellOverrideId = typeof window !== 'undefined'
        ? (window.localStorage.getItem('cactai_devshell_personality') ?? undefined)
        : undefined;
    const activeId = devshellOverrideId ?? personality?.active_id;
    const activePersonality = activeId ? personality?.available.find(p => p.id === activeId) : undefined;
    const agentDisplayName = activePersonality?.display_name
        ?? (activeId ? activeId.charAt(0).toUpperCase() + activeId.slice(1) : 'Ember');
    // Effective origin for the open guide — from loaded content, else inferred
    // from the surface so the panel routes to the right host while loading.
    const guideEffectiveOrigin = guide
        ? (guide.content?.origin
            ?? (guide.surface === 'file_directory' ? 'bottom'
                : guide.surface === 'pending_edits' ? 'modal-split'
                    : 'top'))
        : null;
    const character = activeId ? BUILTIN_CHARACTERS[activeId] : undefined;
    // messages, streamingContent, agentState come from MUIShell store via subscribe effect above.
    const availableRoles = []; // Phase 2 (next): build {role, label, session_id} from tenant_members
    // syncState derives from pendingFiles count: any pending row means
    // we're in the 'local · N uncommitted' state, otherwise 'dev · synced'.
    const syncState = pendingFiles.length > 0
        ? { branch: 'local', uncommittedFiles: pendingFiles.map(f => f.path) }
        : { branch: 'dev', synced: true };
    // The DevShell runs at /dev on the developer's preview deployment, so
    // window.location.origin IS that deployment's base. Both preview
    // surfaces derive from it:
    //   - ThemeInspector live preview  → `${origin}/_studio/preview`
    //   - Test Drive app preview       → the production URL when known,
    //     else the preview origin itself.
    // Without these threaded through, both the Theme inspector's preview
    // column and the Test Drive preview rendered their "unavailable" /
    // "commit to dev" placeholders despite both surfaces being fully built.
    const deployOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    // Persist project-level notes, then re-fetch to confirm the stored value.
    const saveProjectNotes = async (markdown) => {
        await fetch('/api/workflow/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: markdown }),
        });
        setProjectNotes(markdown);
    };
    // Append a note to one decision's thread, then optimistically update.
    const addDecisionNote = async (decisionKey, content) => {
        const res = await fetch('/api/workflow/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision_key: decisionKey, content }),
        });
        if (res.ok) {
            setDecisionNotes(prev => ({
                ...prev,
                [decisionKey]: [...(prev[decisionKey] ?? []), { at: new Date().toISOString(), content }],
            }));
        }
    };
    // decisions / backlog / sprints / workflowStep are stateful (set by
    // the polling effect above). Modal + guide state (onboardingOpen,
    // completionOpen, guide) is declared above the early returns to keep
    // React's hook order stable across renders.
    // Skills come from MUIShell's own registry — already populated when
    // MUIShell.init ran (and re-populated as new packages register).
    const skills = shell.getStore().getSkillsLibrary();
    return (_jsxs(_Fragment, { children: [_jsx(DevShell, { shell: shell, projectId: projectId, projectName: projectName, branch: "dev", syncState: syncState, pendingFiles: pendingFiles, developerInitials: developerInitials, developerName: developerName, agentDisplayName: agentDisplayName, character: character, agentState: agentState, messages: messages, streamingContent: streamingContent, availableRoles: availableRoles, apiBaseUrl: cactaiBase, studioPreviewUrl: deployOrigin ? `${deployOrigin}/_studio/preview` : undefined, vercelPreviewUrl: productionUrl ?? deployOrigin ?? undefined, projectNotes: projectNotes, onSaveProjectNotes: saveProjectNotes, decisionNotes: decisionNotes, onAddDecisionNote: addDecisionNote, buildSurfaceSlot: primitiveTree ? (_jsx(PrimitiveTreeRenderer, { root: primitiveTree, theme: SAMTheme.tokens, postEvent: postEvent })) : null, onOpenFileGuide: () => openGuide('file_directory'), onOpenGuide: openGuide, onAuthoringAssist: (prompt) => { void shell?.submitInput(prompt); }, 
                // ⓘ-guide overlays. The open guide routes to its container by origin:
                // top/right ⇒ chat slot, bottom ⇒ files panel, modal-split ⇒ pending
                // modal. The origin is known from the surface before content loads
                // (file_directory ⇒ bottom; pending_edits ⇒ modal-split; else ⇒ top), so
                // the loading shimmer animates into the right container.
                chatGuideSlot: guide && (guideEffectiveOrigin === 'top' || guideEffectiveOrigin === 'right') ? (_jsx(GuidePanel, { open: true, onClose: closeGuide, origin: guide.content?.origin ?? 'top', title: guide.content?.title ?? 'Guide', blocks: guide.content?.blocks ?? [], loading: guide.loading })) : null, filesGuideSlot: guide && guideEffectiveOrigin === 'bottom' ? (_jsx(GuidePanel, { open: true, onClose: closeGuide, origin: "bottom", title: guide.content?.title ?? 'Guide', blocks: guide.content?.blocks ?? [], loading: guide.loading })) : null, onOpenPendingGuide: () => (guide?.surface === 'pending_edits' ? closeGuide() : openGuide('pending_edits')), pendingGuideSlot: guide && guideEffectiveOrigin === 'modal-split' ? (_jsx(GuidePanel, { open: true, onClose: closeGuide, origin: "modal-split", title: guide.content?.title ?? 'Guide', blocks: guide.content?.blocks ?? [], loading: guide.loading })) : null, onRoleSwitch: () => { }, onCommitToDev: async (paths, opts) => {
                    // Phase 3b — POST /api/git/commit. The route reads file
                    // content from pending_files server-side (per the user's
                    // RLS-scoped rows), so we don't need to ferry blob bytes
                    // through the browser. paths optionally narrows which pending
                    // rows to commit; omitting commits all of them.
                    const res = await fetch('/api/git/commit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            branch: 'dev',
                            message: opts?.message ?? `DevShell: ${paths.length} file(s)`,
                            paths,
                            reverts_sha: opts?.reverts_sha,
                        }),
                    });
                    if (!res.ok) {
                        // Surface the route's error to the modal so the developer
                        // sees the actual reason (auth, GitHub API, conflict, etc.)
                        // instead of a silent fail.
                        const body = await res.json().catch(() => ({}));
                        throw new Error(`Commit failed: ${body.error ?? res.status} ${body.detail ?? ''}`);
                    }
                    // Refresh file tree so the new commit + cleared pending state
                    // shows immediately, ahead of the next 4s pending poll.
                    const treeRes = await fetch('/api/git/tree?branch=dev', { cache: 'no-store' });
                    if (treeRes.ok) {
                        const b = await treeRes.json();
                        setTreeNodes(b.tree ?? []);
                    }
                    setPendingFiles([]);
                }, onDiscardPendingFile: async (path) => {
                    // Phase 3b-2 — direct DELETE on pending_files for one path.
                    // The route uses the customer's SUPABASE_SERVICE_KEY; RLS
                    // would also constrain to the caller's own row via auth.uid().
                    await fetch(`/api/git/pending?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
                    setPendingFiles(prev => prev.filter(f => f.path !== path));
                }, onDiscardAllPending: async () => {
                    await fetch('/api/git/pending', { method: 'DELETE' });
                    setPendingFiles([]);
                }, onCreateFile: async (path, content = '') => {
                    const res = await fetch('/api/git/file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, content }),
                    });
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        recordFetchError('pending', { status: res.status, code: body.error, detail: body.detail });
                        return;
                    }
                    // Surface the new staged row immediately; the file-tree picks it
                    // up via the next /api/git/tree-with-pending poll regardless.
                    setPendingFiles(prev => prev.find(p => p.path === path)
                        ? prev
                        : [...prev, { path, operation: 'create', linesAdded: 0, linesRemoved: 0, lastEditedAt: new Date().toISOString() }]);
                }, onRenameFile: async (path, newPath) => {
                    const res = await fetch('/api/git/file', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, new_path: newPath }),
                    });
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        recordFetchError('pending', { status: res.status, code: body.error, detail: body.detail });
                        return;
                    }
                    setPendingFiles(prev => [
                        ...prev.filter(p => p.path !== path),
                        { path, operation: 'rename', newPath, linesAdded: 0, linesRemoved: 0, lastEditedAt: new Date().toISOString() },
                    ]);
                }, onDeleteFile: async (path) => {
                    const res = await fetch(`/api/git/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        recordFetchError('pending', { status: res.status, code: body.error, detail: body.detail });
                        return;
                    }
                    setPendingFiles(prev => [
                        ...prev.filter(p => p.path !== path),
                        { path, operation: 'delete', linesAdded: 0, linesRemoved: 0, lastEditedAt: new Date().toISOString() },
                    ]);
                }, treeNodes: treeNodes, activeFilePath: activeFilePath, fileContent: fileContent, fileLoading: fileLoading, onFileSelect: onFileSelect, onExitFileView: onExitFileView, workflowStep: workflowStep, workflowForm: workflowForm ?? undefined, decisions: decisions, backlog: backlog, sprints: sprints, onWorkflowFormSubmit: async (choices) => {
                    // Form submit → synthetic stage_step input. Builds the canonical
                    // token shape Branch 1 already handles:
                    //   __event__:select:stage_step:<step_id> <json-payload>
                    // and posts it as plain input to /v1/shell/turn. /v1/shell/event
                    // requires a target_id registered from a prior PrimitiveNode
                    // emission; polled forms don't have one, so we use the turn
                    // endpoint which accepts synthetic input directly.
                    if (!workflowForm || !sessionId)
                        return;
                    const field = workflowForm.fields[0];
                    if (!field)
                        return;
                    const raw = choices[field.key];
                    let payload = {};
                    if (field.type === 'multi_select' && Array.isArray(raw)) {
                        const values = raw.map(lbl => field.option_values?.find(o => o.label === lbl)?.value ?? lbl);
                        payload = { values };
                    }
                    else if (typeof raw === 'string') {
                        const value = field.option_values?.find(o => o.label === raw)?.value ?? raw;
                        payload = { value };
                    }
                    else if (raw !== undefined && raw !== null) {
                        payload = { value: raw };
                    }
                    const synthetic = `__event__:select:stage_step:${workflowForm.stage} ${JSON.stringify(payload)}`;
                    try {
                        await fetch('/api/cactai/v1/shell/turn', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                session_id: sessionId,
                                input: synthetic,
                            }),
                        });
                        setWorkflowForm(null);
                    }
                    catch (err) {
                        recordFetchError('workflow', { detail: err.message });
                    }
                }, onRevisitDecision: (key) => {
                    // Chat-inject pattern: focus the chat and pre-fill it with a
                    // revisit request. The agent (in branches 2-4 or the open
                    // sprint loop) reads the chat input and walks the decision log
                    // re-evaluation conversationally. No server-side re-walk
                    // machinery for v1 — keep state writes single-pathed through
                    // Branch 1.
                    const decision = decisions[key];
                    const label = decision?.method ? key : key;
                    const value = decision?.value !== undefined ? String(decision.value) : 'unknown';
                    const message = `I'd like to revisit my answer for "${label}" (current: ${value}).`;
                    if (typeof window !== 'undefined') {
                        // Custom event the rich shell's DevChatPanel listens for. If
                        // it isn't wired (tests / SSR), the listener is a no-op and
                        // we surface the intent in the diagnostics console.
                        window.dispatchEvent(new CustomEvent('cactai:chat:inject', { detail: { message } }));
                    }
                }, onResolveBacklog: async (id) => {
                    try {
                        const res = await fetch(`/api/workflow/backlog/${encodeURIComponent(id)}/resolve`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('workflow', { status: res.status, code: body.error, detail: body.detail });
                            return;
                        }
                        setBacklog(prev => prev.filter(b => b.id !== id));
                    }
                    catch (err) {
                        recordFetchError('workflow', { detail: err.message });
                    }
                }, onCreateBacklog: async (description) => {
                    const res = await fetch('/api/workflow/backlog', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ description }),
                    });
                    if (!res.ok)
                        return;
                    const body = await res.json().catch(() => ({}));
                    if (body.entry)
                        setBacklog(prev => [body.entry, ...prev]);
                }, onUpdateBacklog: async (id, description) => {
                    const res = await fetch(`/api/workflow/backlog/${encodeURIComponent(id)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ description }),
                    });
                    if (!res.ok)
                        return;
                    setBacklog(prev => prev.map(b => b.id === id ? { ...b, description } : b));
                }, onDeleteBacklog: async (id) => {
                    const res = await fetch(`/api/workflow/backlog/${encodeURIComponent(id)}`, { method: 'DELETE' });
                    if (!res.ok)
                        return;
                    setBacklog(prev => prev.filter(b => b.id !== id));
                }, onRenameSprint: async (id, name) => {
                    const res = await fetch(`/api/workflow/sprints/${encodeURIComponent(id)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name }),
                    });
                    if (!res.ok)
                        return;
                    setSprints(prev => prev.map(s => s.id === id ? { ...s, name } : s));
                }, onDeleteSprint: async (id) => {
                    const res = await fetch(`/api/workflow/sprints/${encodeURIComponent(id)}`, { method: 'DELETE' });
                    if (!res.ok)
                        return;
                    setSprints(prev => prev.filter(s => s.id !== id));
                }, workspaceProps: {
                    // productionUrl comes from the skeleton wrapper, which has
                    // NEXT_PUBLIC_SITE_URL inlined at build time (Next's static
                    // analysis only matches dot-notation on process.env, so the
                    // skeleton-side wrapper does the read and passes it in).
                    // Falls back to window.location.origin so the button still
                    // does something when productionUrl wasn't provided.
                    onOpenApp: () => {
                        const url = productionUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
                        if (url)
                            window.open(url, '_blank', 'noopener,noreferrer');
                    },
                    // ⓘ guide button → opens the workspace guide (origin top — drops down
                    // into the chat slot, non-blocking). Content is fetched per-surface
                    // from the platform so copy is updatable without a customer rebuild.
                    // Auto-modal triggers stay reserved for the system: once at wizard
                    // completion (welcome content), once at workflow completion (the
                    // WorkflowCompletionModal). The workspace guide already folds in the
                    // workflow-completion section when workflow_step is 'complete'.
                    onOpenGuide: () => openGuide('workspace'),
                    // Platform update affordance. The pill in the workspace panel
                    // header only renders when has_update is true.
                    updateStatus: updateStatus,
                    onOpenUpdate: () => setUpdateModalOpen(true),
                }, buildProps: {
                    tools: [],
                    // Capability config lives on the customer DB. The skeleton's
                    // /api/settings/capabilities PATCH handles read-modify-write
                    // on project_state.decisions.capability_config_v2 + pushes a
                    // platform-side cache invalidation so the next turn sees the
                    // change without waiting 60s. Both handlers refresh the
                    // settings panel optimistically by re-fetching after success
                    // (the existing 10s settings poll picks it up regardless;
                    // explicit refresh is just snappier).
                    // Skill enable/disable writes to APPSHELL scope, not devshell.
                    // The skeleton's capabilities route documents devshell.enabled
                    // as a no-op ("Devshell never hides anything from itself");
                    // the meaningful target is appshell.enabled which controls
                    // whether the deployed app's MUI runtime sees the skill.
                    //
                    // See memory: skill-state-source-of-truth.md — the panel's
                    // "active" badge reads a separate local SkillRegistry flag
                    // that has no persistence layer today. Until MUIShell.init
                    // bootstraps the registry from capability_config, refresh
                    // wipes that badge. Resolving that is part of the launch
                    // decision logged in the memo.
                    onActivateSkill: async (skillId) => {
                        const prev = capabilityConfig;
                        shell?.activateSkill(skillId);
                        const res = await fetch('/api/settings/capabilities', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ scope: 'appshell', set_enabled: { id: skillId, enabled: true } }),
                        });
                        if (!res.ok) {
                            shell?.deactivateSkill(skillId);
                            setCapabilityConfig(prev);
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('capability_patch', { status: res.status, code: body.error ?? 'capability_patch_failed', detail: body.detail });
                            return;
                        }
                        recordFetchError('capability_patch', null);
                        const refetch = await fetch('/api/settings/capabilities', { cache: 'no-store' });
                        if (refetch.ok) {
                            const body = await refetch.json();
                            setCapabilityCat(body.catalogue ?? []);
                            setCapabilityConfig(body.config ?? null);
                        }
                    },
                    onDeactivateSkill: async (skillId) => {
                        const prev = capabilityConfig;
                        shell?.deactivateSkill(skillId);
                        const res = await fetch('/api/settings/capabilities', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ scope: 'appshell', set_enabled: { id: skillId, enabled: false } }),
                        });
                        if (!res.ok) {
                            shell?.activateSkill(skillId);
                            setCapabilityConfig(prev);
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('capability_patch', { status: res.status, code: body.error ?? 'capability_patch_failed', detail: body.detail });
                            return;
                        }
                        recordFetchError('capability_patch', null);
                        const refetch = await fetch('/api/settings/capabilities', { cache: 'no-store' });
                        if (refetch.ok) {
                            const body = await refetch.json();
                            setCapabilityCat(body.catalogue ?? []);
                            setCapabilityConfig(body.config ?? null);
                        }
                    },
                    // Build-my-own routes the request into the chat for now — the
                    // agent walks the developer through the scaffold (purpose,
                    // interface, capabilities) and stages files into pending_files.
                    // A dedicated authoring surface is on the v1 roadmap per the
                    // sprint-prioritization memo.
                    onBuildOwn: (type) => {
                        void shell?.submitInput(type === 'skill'
                            ? 'Help me build a new skill. Walk me through what it should do and scaffold it into the repo.'
                            : 'Help me build a new tool. Walk me through what it should do and scaffold it into the repo.');
                    },
                    // Library uploads — developer-brought files indexed in the directory.
                    assets,
                    onUploadAsset,
                    onDeleteAsset,
                    assetDownloadPath,
                    // No marketplace props passed — BuildPanel renders Installed-only
                    // (the v1 surface for dev-authored skills + tools). When MCP
                    // ships, we revisit; when marketplace ships, items / loading /
                    // searchQuery / onSearch / onInstall / onUninstall / onPublish /
                    // filterKind / onFilterKind get re-passed and BuildPanel
                    // automatically re-renders its Browse tab.
                }, skills: skills, schemaProps: {
                    tables: schemaTables,
                    migrations: migrations,
                    // Schema mutations flow through the agent today (chat → ALTER
                    // TABLE suggestion → commit). No in-place table editor exists,
                    // so we don't pass onAddTable / onEditTable — the panel now
                    // renders the "Open in Supabase" link as the only outbound
                    // action, keeping the affordance set honest.
                    supabaseProjectUrl,
                }, settingsProps: {
                    // Credentials — mask map derived from the platform's
                    // visibility flags. Full plaintext never round-trips through
                    // the browser; the panel shows "••••" badges + an Update
                    // button per key.
                    credentials: credentialsState ? {
                        ...(credentialsState.anthropic_set ? { anthropic_api_key: '••••' } : {}),
                        ...(credentialsState.openai_set ? { openai_api_key: '••••' } : {}),
                        ...(credentialsState.google_oauth_set ? { google_oauth: '••••' } : {}),
                    } : {},
                    // onSaveCredential: POST /api/settings/credentials. The route
                    // refuses values that look like secrets (these belong in
                    // Vercel env vars per the security stance); the diagnostics
                    // badge surfaces that 400 so the developer knows where to
                    // put the secret instead.
                    onSaveCredential: async (key, value) => {
                        const res = await fetch('/api/settings/credentials', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key, value }),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('credential_save', { status: res.status, code: body.error, detail: body.detail });
                        }
                        else {
                            recordFetchError('credential_save', null);
                        }
                    },
                    personality: personality ?? undefined,
                    workflow: workflowSettings ?? undefined,
                    byok: byok ?? undefined,
                    capabilityConfig: capabilityConfig ?? undefined,
                    roleCatalog,
                    onRolePatch,
                    agentConfig,
                    onAgentToggle,
                    aiPolicy,
                    onAIPolicyPatch,
                    tiers,
                    onTierBudgetPatch,
                    // MCP — devshell-scope integrations for this project (sprint-1
                    // UI: persisted-but-inert). Catalog + explainer from mui;
                    // handlers hit /v1/projects/:id/mcp/devshell through the proxy.
                    mcpServers,
                    mcpCatalog: MCP_CATALOGS.devshell,
                    mcpExplainer: MCP_EXPLAINERS.devshell,
                    mcpLoading,
                    onMCPAdd,
                    onMCPRemove,
                    onMCPToggle,
                    // Catalogue needed for the CapabilityListPanel's appshell
                    // section render — without it the panel falls back to a
                    // "configuration data is loading…" placeholder.
                    capabilityCatalogue: capabilityCat,
                    // PATCH callbacks for each settings sub-surface. Each writes
                    // through the skeleton's per-route handler, then immediately
                    // re-fetches the same source so the panel doesn't have to
                    // wait the full 10s for the next poll. Diagnostics catches
                    // every failed write with its own source key.
                    onBYOKPatch: async (patch) => {
                        const res = await fetch('/api/settings/byok', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(patch),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('byok_patch', { status: res.status, code: body.error, detail: body.detail });
                            return;
                        }
                        recordFetchError('byok_patch', null);
                        const refetch = await fetch('/api/settings/byok', { cache: 'no-store' });
                        if (refetch.ok)
                            setByok(await refetch.json());
                    },
                    onPersonalityPatch: async (patch) => {
                        const res = await fetch('/api/settings/personality', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(patch),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('personality_patch', { status: res.status, code: body.error, detail: body.detail });
                            return;
                        }
                        recordFetchError('personality_patch', null);
                        const refetch = await fetch('/api/settings/personality', { cache: 'no-store' });
                        if (refetch.ok)
                            setPersonality(await refetch.json());
                    },
                    onWorkflowPatch: async (patch) => {
                        const res = await fetch('/api/settings/workflow', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(patch),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('workflow_patch', { status: res.status, code: body.error, detail: body.detail });
                            return;
                        }
                        recordFetchError('workflow_patch', null);
                        const refetch = await fetch('/api/settings/workflow', { cache: 'no-store' });
                        if (refetch.ok)
                            setWorkflowSettings(await refetch.json());
                    },
                    onCapabilityPatch: async (patch) => {
                        const res = await fetch('/api/settings/capabilities', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(patch),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            recordFetchError('capability_patch', { status: res.status, code: body.error, detail: body.detail });
                            return;
                        }
                        recordFetchError('capability_patch', null);
                        const refetch = await fetch('/api/settings/capabilities', { cache: 'no-store' });
                        if (refetch.ok) {
                            const body = await refetch.json();
                            setCapabilityCat(body.catalogue ?? []);
                            setCapabilityConfig(body.config ?? null);
                        }
                    },
                }, dashboardUrl: dashboardUrl, 
                // DevShell preferences modal (avatar menu → Tools and skills…).
                // Distinct from ProjectSettingsPanel.Configuration which controls
                // the deployed app (appshell scope); this controls what's
                // available inside the IDE (devshell scope). Pre-wiring this prop
                // was undefined which made the modal render the "configuration is
                // loading…" stub forever — what the user saw as the empty
                // Tools+Skills modal that never resolved.
                //
                // capabilityCat + capabilityConfig are already loaded by the
                // /api/settings/capabilities fetch. The onPatch hits the same
                // endpoint that wires the appshell side; the route reads scope
                // from the patch payload so the same handler covers both.
                devshellPreferences: capabilityConfig
                    ? {
                        catalogue: capabilityCat,
                        config: capabilityConfig.devshell ?? { enabled: {}, defaults_by_category: {} },
                        // The patch already has scope: 'devshell' baked in by
                        // CapabilityListPanel inside DevShellPreferencesModal — same
                        // contract the appshell-side onCapabilityPatch above uses.
                        onPatch: async (patch) => {
                            const res = await fetch('/api/settings/capabilities', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(patch),
                            });
                            if (!res.ok) {
                                const body = await res.json().catch(() => ({}));
                                recordFetchError('capability_patch', { status: res.status, code: body.error, detail: body.detail });
                                return;
                            }
                            recordFetchError('capability_patch', null);
                            const refetch = await fetch('/api/settings/capabilities', { cache: 'no-store' });
                            if (refetch.ok) {
                                const body = await refetch.json();
                                setCapabilityCat(body.catalogue ?? []);
                                setCapabilityConfig(body.config ?? null);
                            }
                        },
                        // Devshell-scope MCP for the Integrations tab — same servers +
                        // handlers the App Config Integrations tab uses (both write to
                        // /v1/projects/:id/mcp/devshell).
                        mcp: {
                            servers: mcpServers,
                            catalog: MCP_CATALOGS.devshell,
                            explainer: MCP_EXPLAINERS.devshell,
                            loading: mcpLoading,
                            onAdd: onMCPAdd,
                            onRemove: onMCPRemove,
                            onToggle: onMCPToggle,
                        },
                    }
                    : undefined }), _jsx(FetchErrorBadge, { errors: fetchErrors }), _jsx(OnboardingModal, { open: onboardingOpen, onClose: dismissOnboarding, personalityName: agentDisplayName }), _jsx(WorkflowCompletionModal, { open: completionOpen, onClose: dismissCompletion, productionUrl: productionUrl, topRankRoleName: topRankRoleName ?? undefined, autoPromoteOnFirstSignup: autoPromoteOnFirstSignup }), _jsx(UpdateAvailableModal, { open: updateModalOpen, onClose: () => setUpdateModalOpen(false), currentPlatformSha: updateStatus?.current_platform_sha ?? undefined, latestPlatformSha: updateStatus?.latest_platform_sha, onApply: applyUpdate }), capPrompt && (_jsx(ProviderKeyModal, { detail: capPrompt.detail, onSaved: capPrompt.retry, onDismiss: () => setCapPrompt(null), endpoints: { cactaiBase, projectId } }))] }));
}
// ── Diagnostics badge ────────────────────────────────────────────────
// Renders only when at least one fetch source is in error. Lives at
// the wrapper level so it sits OUTSIDE @cactai-io/mui's DevShell —
// the rich shell doesn't have a diagnostics slot and we don't want to
// invent one on its prop surface for this. Click to expand, click again
// to dismiss the panel (errors persist in state, the badge re-shows
// next render until the underlying source recovers).
function FetchErrorBadge({ errors }) {
    const [open, setOpen] = useState(false);
    const entries = Object.values(errors);
    if (entries.length === 0)
        return null;
    return (_jsxs("div", { "data-cactai-shell": true, style: {
            position: 'fixed',
            bottom: 12,
            right: 12,
            zIndex: 9999,
            fontFamily: 'var(--f-ui, system-ui, sans-serif)',
        }, children: [open && (_jsxs("div", { style: {
                    marginBottom: 6,
                    maxWidth: 360,
                    maxHeight: 320,
                    overflowY: 'auto',
                    background: 'var(--c-bg-3, #222018)',
                    color: 'var(--c-text, #F2EFE4)',
                    border: '1px solid var(--c-border-med, rgba(255,255,255,0.14))',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }, children: [_jsx("div", { style: { fontWeight: 600, marginBottom: 8, fontSize: 12 }, children: "DevShell diagnostics" }), entries.map(e => (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("div", { style: { color: 'var(--c-accent, #FF6B35)', fontFamily: 'var(--f-mono, monospace)', fontSize: 10.5 }, children: [e.source, e.status ? ` · HTTP ${e.status}` : '', e.code ? ` · ${e.code}` : ''] }), e.detail && (_jsx("div", { style: { color: 'var(--c-text-2, #A09880)', marginTop: 2 }, children: e.detail }))] }, e.source)))] })), _jsxs("button", { onClick: () => setOpen(o => !o), title: `${entries.length} DevShell fetch ${entries.length === 1 ? 'error' : 'errors'} — click for detail`, style: {
                    background: 'var(--c-bg-3, #222018)',
                    color: 'var(--c-accent, #FF6B35)',
                    border: '1px solid var(--c-border-med, rgba(255,255,255,0.18))',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontFamily: 'var(--f-ui, system-ui, sans-serif)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }, children: [_jsx("span", { style: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--c-accent, #FF6B35)' } }), entries.length, " ", entries.length === 1 ? 'fetch error' : 'fetch errors'] })] }));
}
