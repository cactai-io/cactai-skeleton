// packages/mui/src/shell/MUIShell.ts
// Top-level surface manager. Orchestrates MUI Agent, SkillComposer,
// GenerativeFallback, StreamController, InputRouter, and all surfaces.
// This is the MUI entry point — it constructs and wires all subsystems.
//
// Authority: MUI Architecture v0.2 Sections 1-9, Agents Architecture v0.1 Section 5
// MUI Shell reads RenderDecision and acts. Agent never renders directly.
import { MUIStore } from '../store/MUIStore.js';
import { MUIAgent } from '../agent/MUIAgent.js';
import { StreamController } from '../stream/StreamController.js';
import { InputRouter } from '../input/InputRouter.js';
import { SkillRegistry } from '../generation/SkillRegistry.js';
import { SkillComposer } from '../generation/SkillComposer.js';
import { GenerativeFallback } from '../generation/GenerativeFallback.js';
import { ComplexityAssessor } from '../generation/ComplexityAssessor.js';
import { SkillAutoRegistrar } from '../generation/SkillAutoRegistrar.js';
import { SurfaceRegistry } from '../surfaces/SurfaceRegistry.js';
export class MUIShell {
    store;
    agent;
    streamController;
    inputRouter;
    skillRegistry;
    skillComposer;
    generativeFallback;
    complexityAssessor;
    autoRegistrar;
    surfaceRegistry;
    config;
    renderCallback = null;
    // Studio overlay state — only active in dev mode sessions.
    // Staged inspector context is attached to the next turn's metadata.
    stagedInspectorContext = null;
    constructor(config, device) {
        this.config = config;
        // Initialize store
        this.store = new MUIStore(config.session_id, device);
        // Initialize agent
        this.agent = new MUIAgent();
        // Initialize generation pipeline
        this.skillRegistry = new SkillRegistry(config.platform);
        this.skillComposer = new SkillComposer(this.skillRegistry, config.theme, config.ssr);
        this.complexityAssessor = new ComplexityAssessor();
        // v1.3.5 — generation executes on the platform server. The browser
        // sends inputs to /v1/skills/generate; the Anthropic key never leaves
        // the platform DB. The wrapper carries the platform API base URL and
        // the project Bearer token so it can post to the server.
        this.generativeFallback = new GenerativeFallback(config.platform, config.theme, config.generation_bounds, config.api_base_url, config.platform_api_key ?? '', config.end_user_id);
        this.autoRegistrar = new SkillAutoRegistrar(this.skillRegistry);
        this.surfaceRegistry = new SurfaceRegistry();
        // Initialize stream controller with handoff handler
        this.streamController = new StreamController(this.store, config.api_base_url, (signal) => this.handleHandoff(signal));
        // Initialize input router
        this.inputRouter = new InputRouter(this.store, this.streamController, config.api_base_url);
        // Load configured Skills packages
        for (const manifest of config.skills_packages) {
            this.skillRegistry.loadPackage(manifest);
        }
        // Update store with initial skills library
        this.store.setSkillsLibrary(this.skillRegistry.getAll());
    }
    // Factory initialization — per GAS.init() sequence step 5-6
    static async init(config) {
        const device = MUIShell.detectDevice();
        const shell = new MUIShell(config, device);
        // Subscribe to marketplace skill registrations from the client bridge.
        // Any skill the CactaiClient verifies and imports is mirrored here as
        // a 'marketplace' source UISkill so MUIAgent's RenderContext sees it.
        if (config.client_bridge) {
            config.client_bridge.onMarketplaceSkillLoaded((skill) => {
                shell.skillRegistry.registerMarketplaceSkill({
                    item_id: skill.item_id,
                    semver: skill.semver,
                    bundle_sha256: skill.bundle_sha256,
                    artifact_types: skill.artifact_types,
                    platform: skill.platform,
                    component: skill.component,
                });
                shell.store.setSkillsLibrary(shell.skillRegistry.getAll());
            });
        }
        // Listen for viewport changes (responsive — not morph triggers)
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                shell.store.updateDevice({
                    viewport: { width: window.innerWidth, height: window.innerHeight },
                    breakpoint: MUIShell.computeBreakpoint(window.innerWidth),
                });
            });
        }
        return shell;
    }
    // Register render callback for platform-specific rendering
    onRender(callback) {
        this.renderCallback = callback;
    }
    // Load Skills from existing SKILL_REGISTRY (current repo pattern compatibility)
    loadSkillRegistry(registry) {
        this.skillRegistry.loadFromRegistry(registry);
        this.store.setSkillsLibrary(this.skillRegistry.getAll());
    }
    // Register product-specific surface types
    registerSurface(surfaceType, component) {
        this.surfaceRegistry.register(surfaceType, component);
    }
    // Submit user input — called by ChatInput component.
    // Attaches staged inspector context (if any) and tenant context to metadata.
    async submitInput(content) {
        const metadata = {};
        if (this.stagedInspectorContext) {
            metadata['inspector_context'] = this.stagedInspectorContext;
            this.stagedInspectorContext = null;
        }
        if (this.config.role || this.config.tenant_id) {
            metadata['tenant_context'] = {
                role: this.config.role ?? 'user',
                tenant_id: this.config.tenant_id ?? '',
            };
        }
        const payload = {
            session_id: this.store.getState().session.session_id,
            input_type: 'nl_text',
            content,
            timestamp: new Date().toISOString(),
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };
        await this.inputRouter.dispatch(payload);
    }
    // Called by the studio overlay when a developer clicks a rendered element.
    // Stages the context so it is attached to the next message the developer sends.
    stageInspectorContext(ctx) {
        this.stagedInspectorContext = ctx;
    }
    // Clear staged inspector context (e.g. developer cancels the selection).
    clearInspectorContext() {
        this.stagedInspectorContext = null;
    }
    // Expose staged context so UI can show a "selected: X" indicator.
    getStagedInspectorContext() {
        return this.stagedInspectorContext;
    }
    // Activate a skill in the registry. Called from dev settings panel.
    activateSkill(skillId) {
        this.skillRegistry.activate(skillId);
        this.store.setSkillsLibrary(this.skillRegistry.getAll());
    }
    // Deactivate a skill. Falls back to SDK default for the artifact type.
    deactivateSkill(skillId) {
        this.skillRegistry.deactivate(skillId);
        this.store.setSkillsLibrary(this.skillRegistry.getAll());
    }
    // Register a developer_written skill from the write path.
    registerDeveloperWrittenSkill(opts) {
        this.skillRegistry.registerDeveloperWritten(opts);
        this.store.setSkillsLibrary(this.skillRegistry.getAll());
    }
    // Handle HandoffSignal receipt — called by StreamController
    handleHandoff(signal) {
        const state = this.store.getState();
        // 1. Apply morph state transition
        // MUI Architecture v0.2 Section 7, steps 1-6
        // 2. Push surface record to stack
        this.store.pushSurface({
            surface_id: `surface_${Date.now()}`,
            surface_type: signal.surface_type ?? state.surface.active ?? 'chat',
            pushed_at: new Date().toISOString(),
        });
        // 3. If surface_type present, activate supporting surface
        if (signal.surface_type) {
            this.store.setSupportingType(signal.surface_type);
        }
        // 4. Assemble RenderContext and run agent decision
        this.runRenderCycle(signal);
    }
    // Core render cycle — assembles RenderContext, runs MUI Agent, acts on decision
    async runRenderCycle(signal) {
        const state = this.store.getState();
        const device = this.store.getDevice();
        // Assemble RenderContext per SDK Architecture
        const renderContext = {
            session_id: state.session.session_id,
            project_id: this.config.project_id ?? '',
            turn_count: state.session.turn_count,
            current_surface: state.surface.active,
            morph_state: signal?.morph_state ?? 'thinking',
            pending_stream: [],
            latest_output: state.conversation.messages[state.conversation.messages.length - 1],
            latest_handoff: signal,
            skills_library: this.skillRegistry.getAll(),
            artifact_index: this.buildArtifactIndex(state.artifacts.registry),
            device,
        };
        // MUI Agent decides — pure reasoning function
        const decision = this.agent.decide(renderContext);
        // Act on decision
        await this.actOnDecision(decision, renderContext);
    }
    // MUI Shell acts on RenderDecision
    async actOnDecision(decision, context) {
        const output = {
            morph_state: decision.morph_to ?? context.morph_state,
            surface_type: decision.surface_change,
        };
        if (decision.error_surface) {
            output.error = `Error surface: ${decision.error_surface}`;
            this.emitRender(output);
            return;
        }
        if (decision.tier === 1 && decision.skill) {
            // Tier 1: Skill Composition
            const artifact = context.latest_output?.output?.artifacts?.[0];
            const result = this.skillComposer.compose(decision.skill, artifact, context.latest_handoff?.surface_config);
            if (result.success) {
                output.component = result.component;
                output.code = result.code;
                this.emitRender(output);
                return;
            }
            // Tier 1 failed — fall through to Tier 2
            const assessment = this.complexityAssessor.assess(decision.skill.artifact_types[0] ?? 'unknown', context.latest_handoff?.surface_config, context.latest_handoff ?? undefined);
            const genResult = await this.generativeFallback.generate(assessment, artifact, context.latest_handoff?.surface_config);
            if (genResult.code) {
                output.code = genResult.code;
                this.emitRender(output);
                // Render confirmation will be set externally — then auto-register
                this.pendingGeneration = { result: genResult, assessment, artifactType: decision.skill.artifact_types[0] ?? 'unknown' };
            }
            else {
                output.error = 'Generative fallback produced no code';
                this.emitRender(output);
            }
            return;
        }
        if (decision.tier === 2) {
            // Tier 2: Generative Fallback
            const artifact = context.latest_output?.output?.artifacts?.[0];
            const assessment = this.complexityAssessor.assess(context.latest_handoff?.surface_type ?? 'unknown', context.latest_handoff?.surface_config, context.latest_handoff ?? undefined);
            const genResult = await this.generativeFallback.generate(assessment, artifact, context.latest_handoff?.surface_config);
            if (genResult.code) {
                output.code = genResult.code;
                this.emitRender(output);
                this.pendingGeneration = {
                    result: genResult,
                    assessment,
                    artifactType: context.latest_handoff?.surface_type ?? 'unknown',
                };
            }
            else {
                output.error = 'Generative fallback produced no code';
                this.emitRender(output);
            }
            return;
        }
        // Morph-only decision (no artifact rendering needed)
        this.emitRender(output);
    }
    // Pending generation result awaiting render confirmation
    pendingGeneration = null;
    // Called externally after successful render confirmation
    // Read-only surfaces: render completes without error = confirmed
    // Interactive surfaces: first successful user interaction = confirmed
    confirmRender() {
        if (!this.pendingGeneration)
            return;
        const { result, assessment, artifactType } = this.pendingGeneration;
        result.render_confirmed = true;
        this.autoRegistrar.register(result, {
            platform: this.config.platform,
            ssr: this.config.ssr,
            artifactType,
            complexity: assessment.complexity,
        });
        // Update skills library in store
        this.store.setSkillsLibrary(this.skillRegistry.getAll());
        this.pendingGeneration = null;
    }
    // Called when user reports a poorly rendered surface
    reportDefect(_description) {
        if (this.pendingGeneration) {
            this.pendingGeneration.result.reported = true;
        }
        // Trigger in-session regeneration at same or higher model tier.
        // Defect bundle capture is deferred to the render defect reporting system.
        this.runRenderCycle();
    }
    // Error handling: dismiss or retry
    dismissError() {
        this.store.setActiveError(null);
    }
    // Re-running the last input requires storing it. Currently a no-op stub
    // until last-input persistence lands; calling it just clears the error
    // banner so the UI is in a sensible state.
    async retryLastInput() {
        this.store.setActiveError(null);
    }
    // Emit render output to platform renderer
    emitRender(output) {
        if (this.renderCallback) {
            this.renderCallback(output);
        }
    }
    // Build lightweight artifact index for RenderContext
    buildArtifactIndex(registry) {
        return Object.values(registry).map(a => ({
            id: a.id,
            type: a.type,
            subtype: a['subtype'],
            title: a['title'],
        }));
    }
    // Accessor for external components
    getStore() {
        return this.store;
    }
    getInputRouter() {
        return this.inputRouter;
    }
    // Device detection at initialization
    static detectDevice() {
        if (typeof window === 'undefined') {
            // SSR fallback
            return {
                viewport: { width: 1280, height: 800 },
                platform: 'web',
                capabilities: { touch: false, pointer: true, reducedMotion: false, highContrast: false },
                breakpoint: 'lg',
            };
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        return {
            viewport: { width, height },
            platform: 'web',
            capabilities: {
                touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                pointer: window.matchMedia('(pointer: fine)').matches,
                reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                highContrast: window.matchMedia('(prefers-contrast: more)').matches,
            },
            breakpoint: MUIShell.computeBreakpoint(width),
        };
    }
    static computeBreakpoint(width) {
        if (width < 640)
            return 'sm';
        if (width < 1024)
            return 'md';
        if (width < 1280)
            return 'lg';
        return 'xl';
    }
}
//# sourceMappingURL=MUIShell.js.map