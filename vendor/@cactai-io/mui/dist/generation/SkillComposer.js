// packages/mui/src/generation/SkillComposer.ts
// Tier 1 — composes Skills into platform-specific component code.
// Always preferred over Tier 2 when a matching Skill exists.
//
// Authority: MUI Doctrine v1.2 Section XV.1 (Tier 1), Skills Architecture v0.1 Section 8
export class SkillComposer {
    registry;
    theme;
    ssr;
    constructor(registry, theme, ssr) {
        this.registry = registry;
        this.theme = theme;
        this.ssr = ssr;
    }
    // Compose a Skill into a renderable result.
    // Called by MUI Shell when RenderDecision.tier === 1.
    compose(descriptor, artifactData, surfaceConfig) {
        const skill = this.registry.getSkill(descriptor.skill_id);
        if (!skill) {
            return {
                success: false,
                error: `Skill not found in registry: ${descriptor.skill_id}`,
            };
        }
        // Retrieve module reference (set during loadFromRegistry)
        const module = this.registry.getModule(skill);
        if (!module) {
            return {
                success: false,
                error: `Skill module not loaded: ${descriptor.skill_id}`,
            };
        }
        const payload = {
            descriptor,
            artifact_data: artifactData,
            theme: this.theme,
            ssr: this.ssr,
            surface_config: surfaceConfig,
        };
        try {
            const m = module;
            const renderFn = m.render ?? m.default?.render;
            if (typeof renderFn !== 'function') {
                return {
                    success: false,
                    error: `Skill ${descriptor.skill_id} does not export a render function`,
                };
            }
            const result = renderFn({
                artifact: artifactData,
                theme: this.theme,
                ssr: this.ssr,
                onEscalate: undefined, // Connected by MUIShell after composition
            });
            if (result && result.success === false) {
                return {
                    success: false,
                    error: result.error ?? `Skill render returned failure: ${descriptor.skill_id}`,
                };
            }
            return {
                success: true,
                component: result.component ?? result,
                code: result.code,
            };
        }
        catch (err) {
            // Skill invocation failure — does not remove Skill from library.
            // MUI Shell falls through to Tier 2.
            return {
                success: false,
                error: err instanceof Error ? err.message : `Skill invocation failed: ${descriptor.skill_id}`,
            };
        }
    }
}
//# sourceMappingURL=SkillComposer.js.map