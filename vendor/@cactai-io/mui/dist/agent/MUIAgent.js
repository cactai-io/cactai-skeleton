// packages/mui/src/agent/MUIAgent.ts
// MUI Agent — pure reasoning function that returns a typed RenderDecision.
// MUI Shell reads the decision and acts. Agent never renders, never invokes Skills directly.
//
// Authority: Agents Doctrine v0.1 Section 5, MUI Doctrine v1.2 Section IX
// Axiom A3: Agents invoke Skills; Skills execute.
// Axiom A6: Skill selection must be deterministic.
export class MUIAgent {
    // Pure reasoning function. Returns a decision — does not execute.
    // MUI Shell acts on the returned RenderDecision.
    decide(context) {
        // 1. Apply morph state from latest handoff if present
        const morph_to = context.latest_handoff?.morph_state ?? undefined;
        const surface_change = context.latest_handoff?.surface_type ?? undefined;
        // 2. Handle error morph state
        if (context.morph_state === 'error' || morph_to === 'error') {
            return {
                tier: 1,
                morph_to: morph_to ?? 'error',
                error_surface: context.latest_output?.error?.code,
            };
        }
        // 3. Handle processing/pending — no render decision needed, just morph
        if (morph_to === 'executing') {
            return { tier: 1, morph_to: 'executing' };
        }
        // 4. Handle awaiting_input — morph only, input surface determined by surface_config
        if (morph_to === 'awaiting_input') {
            return { tier: 1, morph_to: 'awaiting_input', surface_change };
        }
        // 5. If no artifact to render, return morph-only decision
        const artifacts = context.latest_output?.output?.artifacts;
        if (!artifacts || artifacts.length === 0) {
            return { tier: 1, morph_to: morph_to ?? context.morph_state };
        }
        // 6. Determine artifact type from latest output
        const artifact = artifacts[0];
        const artifactType = artifact?.type;
        if (!artifactType) {
            return {
                tier: 1,
                morph_to: morph_to ?? 'unhandled_artifact',
            };
        }
        // 7. Attempt Tier 1 — search SkillsLibrary for matching Skill
        const match = this.findBestMatch(artifactType, context.skills_library, context.current_surface);
        if (match) {
            return {
                tier: 1,
                skill: match,
                morph_to: morph_to ?? 'delivering',
                surface_change,
            };
        }
        // 8. No match — Tier 2 generative fallback
        const { complexity, model_tier } = this.assessComplexity(artifactType, context);
        return {
            tier: 2,
            complexity,
            model_tier,
            morph_to: morph_to ?? 'delivering',
            surface_change,
        };
    }
    // Deterministic Skill matching per Skills Doctrine v0.1 Section VI
    // Resolution order: exact type match > family wildcard match > no match
    // Within matches: configured > generated; render_confirmed required
    findBestMatch(artifactType, library, currentSurface) {
        // Filter to render-confirmed Skills only
        const confirmed = library.filter(s => s.render_confirmed);
        // Exact match candidates
        const exactMatches = confirmed.filter(s => s.artifact_types.includes(artifactType));
        // Family wildcard match (e.g., 'form.*' matches 'form.login')
        const familyMatches = confirmed.filter(s => s.artifact_types.some(at => {
            if (!at.endsWith('.*'))
                return false;
            const family = at.slice(0, -2);
            return artifactType.startsWith(family + '.');
        }));
        const candidates = exactMatches.length > 0 ? exactMatches : familyMatches;
        if (candidates.length === 0)
            return undefined;
        // Configured Skills always supersede generated ones (Axiom S7)
        const configured = candidates.filter(s => s.source === 'configured');
        if (configured.length > 0)
            return configured[0];
        return candidates[0];
    }
    // Complexity assessment for Tier 2 model tier selection
    // MUI Doctrine XV.1: simple → Haiku, standard → Sonnet, complex → Opus
    // Model selection is MUI's autonomous reasoning — not configurable per-request
    assessComplexity(artifactType, context) {
        // Simple: basic inputs, buttons, toasts, single-field forms, status indicators
        const simpleTypes = [
            'toast', 'pending_indicator', 'error_display', 'confirmation',
            'status_badge', 'progress_bar', 'loading_spinner',
        ];
        if (simpleTypes.includes(artifactType)) {
            return { complexity: 'simple', model_tier: 'haiku_4_5' };
        }
        // Complex: multi-panel layouts, interactive editors, 3D, composite dashboards
        const complexTypes = [
            'threed', 'code_editor', 'split_view', 'metrics_dashboard',
            'kanban', 'calendar', 'wizard',
        ];
        if (complexTypes.includes(artifactType)) {
            return { complexity: 'complex', model_tier: 'opus_4_6' };
        }
        // Standard: everything else — general UI generation
        return { complexity: 'standard', model_tier: 'sonnet_4_6' };
    }
}
//# sourceMappingURL=MUIAgent.js.map