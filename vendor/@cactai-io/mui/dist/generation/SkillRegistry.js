// packages/mui/src/generation/SkillRegistry.ts
// SkillsLibrary implementation. Manages Skill lookup, storage, and auto-registration.
// SkillAutoRegistrar is the only writer (Axiom S4).
//
// Authority: Skills Architecture v0.1 Section 7, Skills Doctrine v0.1 Axiom S4
// Module references attached by loadFromRegistry are stored in a WeakMap
// keyed by the UISkill identity rather than smuggled onto the object as a
// non-public field. This keeps the public UISkill shape clean for serialization
// and removes the need for `as any` casts at every read site.
const moduleRefs = new WeakMap();
export class SkillRegistry {
    library = new Map();
    platform;
    constructor(platform) {
        this.platform = platform;
    }
    /** Resolve the stored module reference for a skill, if any. */
    getModule(skill) {
        return moduleRefs.get(skill);
    }
    // MUI Agent reads via RenderContext.skills_library
    // Returns SkillDescriptor projection — no code exposed to agent
    getAll() {
        return Array.from(this.library.values()).map(skill => this.toDescriptor(skill));
    }
    // Returns the single active skill for the given artifact type, or null.
    // Active state is controlled explicitly by the developer via settings —
    // no priority resolution. Only one skill per artifact type can be active.
    findActive(artifactType, platform) {
        const targetPlatform = platform ?? this.platform;
        for (const skill of this.library.values()) {
            if (!skill.active)
                continue;
            if (skill.platform !== targetPlatform && skill.platform !== 'agnostic')
                continue;
            if (this.getArtifactTypes(skill).includes(artifactType)) {
                return this.toDescriptor(skill);
            }
        }
        // Family wildcard fallback
        for (const skill of this.library.values()) {
            if (!skill.active)
                continue;
            if (skill.platform !== targetPlatform && skill.platform !== 'agnostic')
                continue;
            const match = this.getArtifactTypes(skill).some(t => {
                if (!t.endsWith('.*'))
                    return false;
                return artifactType.startsWith(t.slice(0, -2) + '.');
            });
            if (match)
                return this.toDescriptor(skill);
        }
        return null;
    }
    // Returns all skills for a given artifact type regardless of active state.
    // Used by the settings panel to show the developer what is available.
    findAll(artifactType, platform) {
        const targetPlatform = platform ?? this.platform;
        return Array.from(this.library.values())
            .filter(s => {
            if (s.platform !== targetPlatform && s.platform !== 'agnostic')
                return false;
            return this.getArtifactTypes(s).includes(artifactType) ||
                this.getArtifactTypes(s).some(t => t.endsWith('.*') && artifactType.startsWith(t.slice(0, -2) + '.'));
        })
            .map(s => this.toDescriptor(s));
    }
    // Activate a skill for its artifact type. Deactivates any other skill
    // currently active for the same type. Called from dev settings panel.
    activate(skillId) {
        const target = this.library.get(skillId);
        if (!target)
            return;
        for (const skill of this.library.values()) {
            if (skill.skill_id === skillId) {
                this.library.set(skill.skill_id, { ...skill, active: true });
            }
            else if (this.getArtifactTypes(skill).some(t => this.getArtifactTypes(target).includes(t))) {
                this.library.set(skill.skill_id, { ...skill, active: false });
            }
        }
    }
    // Deactivate a skill. The artifact type falls back to the SDK default
    // (the first configured/sdk skill for that type) or remains unhandled.
    deactivate(skillId) {
        const skill = this.library.get(skillId);
        if (!skill)
            return;
        this.library.set(skillId, { ...skill, active: false });
    }
    // SkillAutoRegistrar only — registers generated (Tier 2 fallback) skills.
    // Generated skills are inactive by default; the developer activates them in settings.
    register(skill) {
        if (!skill.render_confirmed)
            return;
        const uiSkill = {
            skill_id: skill.skill_id,
            name: `generated_${skill.artifact_types[0]}`,
            platform: skill.platform,
            surface_type: skill.artifact_types[0],
            source: 'generated',
            active: false,
            registered_at: skill.registered_at,
            render_confirmed: true,
            code: skill.generated_code,
        };
        this.library.set(skill.skill_id, uiSkill);
    }
    // Register a developer_written skill. Called by the write path when a skill
    // is created via the developer agent workflow. Inactive by default —
    // the developer activates it from settings when ready to test.
    registerDeveloperWritten(opts) {
        const surfaceType = opts.artifact_types[0];
        if (!surfaceType)
            return;
        const uiSkill = {
            skill_id: opts.skill_id,
            name: opts.name,
            platform: opts.platform,
            surface_type: surfaceType,
            source: 'developer_written',
            active: false,
            registered_at: new Date().toISOString(),
            render_confirmed: false,
            code: opts.code,
            component: opts.component,
        };
        this.library.set(opts.skill_id, uiSkill);
    }
    // Load developer-configured Skills packages at initialization
    loadPackage(manifest) {
        for (const entry of manifest.skills) {
            const uiSkill = {
                skill_id: entry.id,
                name: entry.name,
                platform: entry.platform,
                surface_type: entry.artifact_types[0],
                ssr: entry.ssr,
                source: 'configured',
                active: true, // SDK-included skills are active by default
                registered_at: new Date().toISOString(),
                render_confirmed: true,
                code: '',
            };
            this.library.set(entry.id, uiSkill);
        }
    }
    // Load Skills from existing SKILL_REGISTRY objects (current repo pattern)
    loadFromRegistry(registry) {
        for (const [artifactType, skillModule] of Object.entries(registry)) {
            const mod = skillModule;
            const desc = mod.descriptor;
            if (!desc)
                continue;
            const uiSkill = {
                skill_id: desc.skill_id ?? `configured_${artifactType}`,
                name: desc.name ?? artifactType,
                platform: desc.platform ?? this.platform,
                surface_type: artifactType,
                ssr: desc.ssr ?? false,
                source: 'configured',
                active: true,
                registered_at: new Date().toISOString(),
                render_confirmed: true,
                code: '',
            };
            this.library.set(uiSkill.skill_id, uiSkill);
            // Store the module reference in the side WeakMap (see top of file).
            moduleRefs.set(uiSkill, skillModule);
        }
    }
    // Retrieve full UISkill with code (for SkillInvoker)
    getSkill(skillId) {
        return this.library.get(skillId);
    }
    // Marketplace skill registration. Called after a bundle has been fetched
    // and its sha256 verified by the loader. The component is the live React
    // component reference (default export) imported from the bundle.
    registerMarketplaceSkill(opts) {
        const skillId = opts.skill_id ?? `marketplace_${opts.item_id}_${opts.semver}`;
        const surfaceType = opts.artifact_types[0];
        if (!surfaceType)
            return;
        const uiSkill = {
            skill_id: skillId,
            name: opts.name ?? `marketplace_${surfaceType}`,
            platform: opts.platform,
            surface_type: surfaceType,
            source: 'marketplace',
            active: false, // developer activates from settings
            registered_at: new Date().toISOString(),
            render_confirmed: true,
            code: '',
            component: opts.component,
            marketplace: {
                item_id: opts.item_id,
                semver: opts.semver,
                bundle_sha256: opts.bundle_sha256,
            },
        };
        this.library.set(skillId, uiSkill);
    }
    // Remove all auto-registered Skills — dev reset or schema change
    clearGenerated() {
        for (const [id, skill] of this.library) {
            if (skill.source === 'generated') {
                this.library.delete(id);
            }
        }
    }
    // Project UISkill → SkillDescriptor (strips code)
    toDescriptor(skill) {
        return {
            skill_id: skill.skill_id,
            name: skill.name,
            platform: skill.platform,
            ssr: skill.ssr ?? false,
            artifact_types: [skill.surface_type],
            source: skill.source,
            active: skill.active,
            render_confirmed: skill.render_confirmed,
            registered_at: skill.registered_at,
            required_tokens: [],
            description: `Renders ${skill.surface_type} artifact type`,
        };
    }
    getArtifactTypes(skill) {
        return [skill.surface_type];
    }
}
//# sourceMappingURL=SkillRegistry.js.map