// packages/mui/src/generation/SkillAutoRegistrar.ts
// Sole writer to SkillsLibrary (Axiom S4).
// Called by MUI Shell after render confirmation of a Tier 2 result.
//
// Authority: Skills Architecture v0.1 Section 9, Skills Doctrine v0.1 Axiom S4, S7
export class SkillAutoRegistrar {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    // Called by MUI Shell after render confirmation of a Tier 2 result.
    // Guards:
    // 1. render_confirmed must be true
    // 2. No manually authored Skill exists for this type + platform
    // 3. No auto-registered Skill already exists for this type + platform
    register(result, context) {
        if (!result.render_confirmed)
            return;
        // Only register generated skill if no active skill exists for this artifact type.
        const active = this.registry.findActive(context.artifactType, context.platform);
        if (active)
            return;
        // Also skip if any non-generated skill exists (configured or developer_written),
        // even if currently inactive — the developer controls activation explicitly.
        const all = this.registry.findAll(context.artifactType, context.platform);
        const hasManaged = all.some(s => s.source === 'configured' || s.source === 'developer_written');
        if (hasManaged)
            return;
        const skill = {
            skill_id: result.skill_id,
            artifact_types: [context.artifactType],
            platform: context.platform,
            ssr: context.ssr,
            generated_code: result.code,
            registered_at: new Date().toISOString(),
            source: 'tier_2_fallback',
            render_confirmed: true,
            complexity: context.complexity,
            model_tier: result.model_tier,
            generation_result_id: result.skill_id,
        };
        this.registry.register(skill);
    }
}
//# sourceMappingURL=SkillAutoRegistrar.js.map