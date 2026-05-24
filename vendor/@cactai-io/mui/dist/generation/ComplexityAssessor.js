// packages/mui/src/generation/ComplexityAssessor.ts
// Assesses rendering complexity and selects model tier for Tier 2 generative fallback.
// Model selection is MUI's autonomous reasoning — not configurable per-request.
//
// Authority: MUI Doctrine v1.2 Section XV.1, XV.7
// Complexity classification rules
// These may be calibrated with production data per MUI Doctrine XV.8
const SIMPLE_INDICATORS = [
    'toast', 'confirmation', 'status_badge', 'progress_bar',
    'loading_spinner', 'pending_indicator', 'error_display',
    'single_input', 'toggle', 'checkbox', 'radio_group',
];
const COMPLEX_INDICATORS = [
    'threed', 'code_editor', 'split_view', 'metrics_dashboard',
    'kanban', 'calendar', 'wizard', 'html_document',
    'html_presentation', 'video_player', 'map',
    'diff_viewer', 'rich_text_editor',
];
const COMPLEXITY_TO_MODEL = {
    simple: 'haiku_4_5',
    standard: 'sonnet_4_6',
    complex: 'opus_4_6',
};
export class ComplexityAssessor {
    assess(surfaceType, surfaceConfig, signal) {
        let complexity;
        let rationale;
        if (SIMPLE_INDICATORS.includes(surfaceType)) {
            complexity = 'simple';
            rationale = `Surface type '${surfaceType}' matches simple component pattern — bounded layout, minimal interactivity.`;
        }
        else if (COMPLEX_INDICATORS.includes(surfaceType)) {
            complexity = 'complex';
            rationale = `Surface type '${surfaceType}' matches complex pattern — multi-panel, highly interactive, or novel rendering.`;
        }
        else {
            // Check surface_config for additional complexity signals
            const config = surfaceConfig;
            const hasNestedSections = config && Array.isArray(config.sections) && config.sections.length > 3;
            const hasInteractiveElements = config && (config.interactive === true || config.editable === true);
            const hasCompositeLayout = config && (config.layout === 'split' || config.layout === 'grid' || config.layout === 'tabs');
            if (hasNestedSections || (hasInteractiveElements && hasCompositeLayout)) {
                complexity = 'complex';
                rationale = `Surface config indicates composite layout with multiple interactive sections.`;
            }
            else if (hasInteractiveElements) {
                complexity = 'standard';
                rationale = `Surface type '${surfaceType}' requires interactive elements — standard generation.`;
            }
            else {
                complexity = 'standard';
                rationale = `Surface type '${surfaceType}' is general UI — standard complexity.`;
            }
        }
        return {
            rendering_need: `Generate ${surfaceType} surface`,
            complexity,
            model_tier: COMPLEXITY_TO_MODEL[complexity],
            rationale,
        };
    }
}
//# sourceMappingURL=ComplexityAssessor.js.map