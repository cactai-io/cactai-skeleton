// packages/mui/src/sdk-manifest.ts
// SDK self-description manifest.
// Machine-readable description of all extension points the developer agent reads
// at the start of every dev session to know what it can scaffold and where things go.
// Also serves as the source of truth for human documentation.
//
// The developer agent reads this via the workflow tools at session start.
// All paths are relative to the app skeleton root.
export const SDK_MANIFEST = {
    version: '1.0.0',
    sdk_package: '@cactai-io/mui',
    role_hierarchy: ['dev', 'collaborator', 'super_admin', 'admin', 'user'],
    workflow_steps: [
        'name_and_intent', 'audience', 'personality', 'theme', 'layout',
        'hero_moment', 'capabilities', 'data_and_memory', 'roles_and_access',
        'preview_live',
    ],
    built_in_personalities: ['sam', 'milo'],
    built_in_tools: [
        'web', 'files', 'export', 'browser', 'data', 'code', 'ai',
        'knowledge', 'payments', 'comms', 'auth', 'productivity',
        'media', 'threed', 'integrations', 'publish', 'github',
    ],
    built_in_skills: [
        'Chart', 'Table', 'Form', 'Modal', 'Wizard', 'Toast',
        'Timeline', 'Kanban', 'Calendar', 'Map', 'MediaViewer',
        'VideoPlayer', 'RichText', 'CodeEditor', 'DiffViewer',
        'ProfileCard', 'FileCard', 'SearchResults', 'ErrorReport',
        'ValidationReport', 'ClassificationCard', 'MetricsDashboard',
        'ProgressTracker', 'DeploymentCard', 'AccountSelector',
        'TranslationView', 'ThreeD', 'ChatThread', 'HTMLChart',
        'HTMLWizard', 'HTMLModal', 'HTMLTable', 'HTMLForm',
        'AudioPlayer', 'CMSEntryCard', 'ImageGallery', 'InvoiceCard',
        'ReceiptCard', 'RepoCard', 'SettingsPanel', 'SocialPostCard',
        'SplitView', 'SubscriptionCard', 'TestResults',
    ],
    extension_points: [
        {
            type: 'skill',
            location: 'src/skills/',
            file_pattern: '[SkillName].skill.tsx',
            descriptor_shape: {
                skill_id: 'string — unique, e.g. my-app/resume-card',
                name: 'string — display name',
                platform: '"react" | "html" | "agnostic"',
                artifact_types: 'string[] — artifact type keys this skill renders',
                ssr: 'boolean',
                required_tokens: 'string[] — theme token dependencies',
                description: 'string',
            },
            registration: 'Add to src/skills/index.ts and activate from Settings > Skills',
            example: 'src/skills/ResumeCard.skill.tsx',
        },
        {
            type: 'tool',
            location: 'src/tools/',
            file_pattern: '[domain].tools.ts',
            registration: 'Add to src/tools/index.ts — auto-loaded at session creation',
        },
        {
            type: 'personality',
            location: 'src/personalities/',
            file_pattern: '[name].ts',
            shape: 'ProductPersonality — see @cactai-io/types',
        },
        {
            type: 'theme',
            location: 'src/themes/',
            file_pattern: '[name].theme.ts',
            tokens: [
                'color_primary', 'color_secondary', 'color_background',
                'color_surface', 'color_text', 'color_text_secondary',
                'color_border', 'color_error', 'color_warning', 'color_success',
                'font_family_base', 'font_family_mono',
                'font_size_sm', 'font_size_md', 'font_size_lg',
                'border_radius_sm', 'border_radius_md', 'border_radius_lg',
                'spacing_unit',
            ],
        },
        {
            type: 'workflow',
            location: 'src/workflows/',
            description: 'Custom multi-step workflows composed from Skills and tools. Registered in src/workflows/index.ts.',
        },
    ],
};
// Serialised form for the developer agent to read at session start.
export function getManifestJSON() {
    return JSON.stringify(SDK_MANIFEST, null, 2);
}
//# sourceMappingURL=sdk-manifest.js.map