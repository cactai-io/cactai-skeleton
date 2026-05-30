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
    // Phase 2b — workflow state from the platform. Polls every 5s while
    // DevShell is mounted so agent-side changes (purpose recorded, plan
    // approved, sprint started, backlog item added) surface in the rail
    // without manual refresh. The endpoint is server-side + bearer-gated;
    // the proxy handles auth.
    const [workflowStep, setWorkflowStep] = useState('name_and_intent');
    const [decisions, setDecisions] = useState({});
    const [backlog, setBacklog] = useState([]);
    const [sprints, setSprints] = useState([]);
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKind, setFilterKind] = useState('all');
    const [marketItems, setMarketItems] = useState([]);
    const [marketLoading, setMarketLoading] = useState(false);
    const [installedIds, setInstalledIds] = useState(new Set());
    const [settings, setSettings] = useState(null);
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
    // Phase 2b — poll workflow state from the platform. Same-origin fetch
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
                if (!res.ok)
                    return;
                const body = await res.json();
                if (cancelled)
                    return;
                setWorkflowStep(body.workflow_step);
                setDecisions(body.decisions ?? {});
                setSprints(body.sprints ?? []);
                setBacklog(body.backlog ?? []);
            }
            catch { /* transient — next tick will retry */ }
        };
        void tick();
        const interval = setInterval(tick, 5000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [cactaiBase, projectId]);
    // Phase 3a — file tree: fetched once on mount. The skeleton route
    // hits GitHub's trees API server-side with GITHUB_TOKEN, so no
    // credential ever reaches the browser. Branch defaults to 'dev'.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch('/api/git/tree?branch=dev', { cache: 'no-store' });
                if (!res.ok)
                    return;
                const body = await res.json();
                if (!cancelled)
                    setTreeNodes(body.tree ?? []);
            }
            catch { /* transient — user can re-open the file panel to retry */ }
        })();
        return () => { cancelled = true; };
    }, []);
    const onFileSelect = async (path) => {
        setActiveFilePath(path);
        setFileLoading(true);
        setFileContent(null);
        try {
            const res = await fetch(`/api/git/file?branch=dev&path=${encodeURIComponent(path)}`, {
                cache: 'no-store',
            });
            if (!res.ok) {
                setFileContent(`// Could not load ${path} (HTTP ${res.status})`);
                return;
            }
            const body = await res.json();
            setFileContent(body.content ?? '');
        }
        catch (e) {
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
    // Phase 3b-2 — pending files: poll every 4s.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const res = await fetch('/api/git/pending', { cache: 'no-store' });
                if (!res.ok)
                    return;
                const body = await res.json();
                if (!cancelled)
                    setPendingFiles(body.files ?? []);
            }
            catch { /* transient */ }
        };
        void tick();
        const interval = setInterval(tick, 4000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);
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
                if (!res.ok)
                    return;
                const body = await res.json();
                if (cancelled)
                    return;
                setSchemaTables(body.tables ?? []);
                setMigrations(body.migrations ?? []);
                if (body.supabase_project_url)
                    setSupabaseProjectUrl(body.supabase_project_url);
            }
            catch { /* transient */ }
        })();
        return () => { cancelled = true; };
    }, []);
    // Phase 3c — marketplace browse: refetch when search / filter changes.
    // The platform endpoint accepts q + kind query params. installed flag
    // gets joined from /v1/installs.
    useEffect(() => {
        let cancelled = false;
        setMarketLoading(true);
        (async () => {
            try {
                const params = new URLSearchParams();
                if (searchQuery)
                    params.set('q', searchQuery);
                if (filterKind !== 'all')
                    params.set('kind', filterKind);
                const [browseRes, installRes] = await Promise.all([
                    fetch(`${cactaiBase.replace(/\/$/, '')}/v1/marketplace?${params.toString()}`, { cache: 'no-store' }),
                    fetch(`${cactaiBase.replace(/\/$/, '')}/v1/installs`, { cache: 'no-store' }),
                ]);
                if (cancelled)
                    return;
                const browseBody = browseRes.ok ? await browseRes.json() : { items: [] };
                const installBody = installRes.ok ? await installRes.json() : { installs: [] };
                const installed = new Set((installBody.installs ?? []).map(i => i.item_id));
                setInstalledIds(installed);
                setMarketItems((browseBody.items ?? []).map(it => ({
                    id: it.id,
                    slug: it.slug,
                    display_name: it.display_name,
                    description: it.description ?? '',
                    kind: it.kind,
                    price_cents: it.price_usd_cents ?? 0,
                    installed: installed.has(it.id),
                    author: it.author_name ?? '',
                    semver: it.latest_semver ?? '0.0.0',
                })));
            }
            catch { /* transient */ }
            finally {
                if (!cancelled)
                    setMarketLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [cactaiBase, searchQuery, filterKind]);
    // Phase 2d — settings, polled every 10s. The endpoint lives at
    // /api/cactai/v1/projects/:id/devshell/settings on the platform.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const res = await fetch(`${cactaiBase.replace(/\/$/, '')}/v1/projects/${projectId}/devshell/settings`, {
                    cache: 'no-store',
                });
                if (!res.ok)
                    return;
                const body = await res.json();
                if (!cancelled)
                    setSettings(body);
            }
            catch { /* transient */ }
        };
        void tick();
        const interval = setInterval(tick, 10000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [cactaiBase, projectId]);
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
    // syncState derives from pendingFiles count: any pending row means
    // we're in the 'local · N uncommitted' state, otherwise 'dev · synced'.
    const syncState = pendingFiles.length > 0
        ? { branch: 'local', uncommittedFiles: pendingFiles.map(f => f.path) }
        : { branch: 'dev', synced: true };
    // decisions / backlog / sprints / workflowStep are stateful (set by
    // the polling effect above).
    // Skills come from MUIShell's own registry — already populated when
    // MUIShell.init ran (and re-populated as new packages register).
    const skills = shell.getStore().getSkillsLibrary();
    return (_jsx(DevShell, { shell: shell, projectId: projectId, projectName: projectName, branch: "dev", syncState: syncState, pendingFiles: pendingFiles, developerInitials: developerInitials, developerName: developerName, agentDisplayName: agentDisplayName, agentState: agentState, messages: messages, streamingContent: streamingContent, availableRoles: availableRoles, apiBaseUrl: cactaiBase, onRoleSwitch: () => { }, onCommitToDev: async (paths, opts) => {
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
        }, treeNodes: treeNodes, activeFilePath: activeFilePath, fileContent: fileContent, fileLoading: fileLoading, onFileSelect: onFileSelect, onExitFileView: onExitFileView, workflowStep: workflowStep, decisions: decisions, backlog: backlog, sprints: sprints, onWorkflowFormSubmit: () => { }, onRevisitDecision: () => { }, onResolveBacklog: () => { }, workspaceProps: {
            onOpenApp: () => { },
        }, buildProps: {
            tools: [],
            onActivateSkill: () => { },
            onDeactivateSkill: () => { },
            // Build-my-own: route the request into the agent. The agent then
            // walks the developer through the scaffold (purpose, interface,
            // capabilities), generates a draft, and stages files into
            // pending_files. A dedicated wizard surface can replace this
            // later, but the chat-driven flow ships value immediately.
            onBuildOwn: (type) => {
                void shell?.submitInput(type === 'skill'
                    ? 'Help me build a new skill. Walk me through what it should do and scaffold it into the repo.'
                    : 'Help me build a new tool. Walk me through what it should do and scaffold it into the repo.');
            },
            items: marketItems,
            loading: marketLoading,
            searchQuery,
            onSearch: (q) => setSearchQuery(q),
            onInstall: async (itemId) => {
                // POST /v1/marketplace/:id/install. The platform records the
                // install and (for skills) flips the SkillRegistry so the next
                // turn can reference the new component.
                const res = await fetch(`${cactaiBase.replace(/\/$/, '')}/v1/marketplace/${itemId}/install`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (res.ok) {
                    setInstalledIds(prev => new Set(prev).add(itemId));
                    setMarketItems(prev => prev.map(i => i.id === itemId ? { ...i, installed: true } : i));
                }
            },
            onUninstall: () => { },
            // Publish flow lives on the marketplace storefront (auth via the
            // cactai.io SSO cookie). Open it in a new tab; the storefront's
            // /publish form recognises the signed-in developer.
            onPublish: () => { window.open('https://marketplace.cactai.io/publish', '_blank', 'noopener,noreferrer'); },
            filterKind,
            onFilterKind: (k) => setFilterKind(k),
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
            // CredentialsRecord shape: a flat record of provider → string.
            // We map the endpoint's *_set booleans into the panel-expected
            // shape; values are intentionally empty strings (the panel
            // shows masked tails — full plaintext is never round-tripped
            // through the browser).
            credentials: settings ? {
                ...(settings.credentials.anthropic_set ? { anthropic_api_key: '••••' } : {}),
                ...(settings.credentials.openai_set ? { openai_api_key: '••••' } : {}),
                ...(settings.credentials.google_oauth_set ? { google_oauth: '••••' } : {}),
            } : {},
            billingEnabled: false,
            collaborators: (settings?.collaborators ?? []),
            onSaveCredential: () => { },
            onInviteCollaborator: () => { },
            onRemoveCollaborator: () => { },
            // Personality / workflow / BYOK use the endpoint's raw values
            // when present; the panel sections render fallback "data not
            // available yet" copy when these are null.
            personality: settings?.personality,
            workflow: settings?.workflow,
            byok: settings?.byok_providers
                ? { providers: settings.byok_providers }
                : undefined,
            capabilityConfig: settings?.capability_config,
        }, dashboardUrl: dashboardUrl }));
}
