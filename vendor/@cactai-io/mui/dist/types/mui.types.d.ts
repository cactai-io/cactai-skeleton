export type { GASErrorCode, GASError, GASErrorType, OutputResponse, StreamEventType, StreamEvent, ReasoningDeltaData, OutputDeltaData, ToolInvokedData, TurnCompleteData, TurnErrorData, HandoffSignalData, MorphState, HandoffSignal, ArtifactObject, GASInputType, ISO8601, GASInputPayload, ArtifactActionContent, HandoffAckContent, MUISurfaceType, SurfaceRecord, SSETextDelta, MUIStore, MessageBubbleProps, StreamingBubbleProps, PendingIndicatorProps, ArtifactCardProps, HandoffBannerProps, ErrorDisplayProps, ChatInputProps, InputRouterProps, RenderingTier, RenderingComplexity, GenerativeModelTier, UISkill, ComplexityAssessment, GenerationResult, RenderDefectBundle, GenerationBounds, } from '@cactai-io/types';
export interface DeviceContext {
    viewport: {
        width: number;
        height: number;
    };
    platform: 'web' | 'native' | 'embedded';
    capabilities: {
        touch: boolean;
        pointer: boolean;
        reducedMotion: boolean;
        highContrast: boolean;
    };
    breakpoint: 'sm' | 'md' | 'lg' | 'xl';
}
export interface RenderContext {
    session_id: string;
    project_id: string;
    turn_count: number;
    current_surface: string;
    morph_state: import('@cactai-io/types').MorphState;
    pending_stream: import('@cactai-io/types').StreamEvent[];
    latest_output?: import('@cactai-io/types').OutputResponse;
    latest_handoff?: import('@cactai-io/types').HandoffSignal;
    skills_library: SkillDescriptor[];
    artifact_index: ArtifactIndexEntry[];
    device: DeviceContext;
}
export interface RenderDecision {
    tier: 1 | 2;
    skill?: SkillDescriptor;
    complexity?: import('@cactai-io/types').RenderingComplexity;
    model_tier?: import('@cactai-io/types').GenerativeModelTier;
    morph_to?: import('@cactai-io/types').MorphState;
    surface_change?: string;
    error_surface?: import('@cactai-io/types').GASErrorCode;
}
export interface SkillDescriptor {
    skill_id: string;
    name: string;
    platform: string | 'agnostic';
    ssr: boolean;
    artifact_types: string[];
    source: 'developer_written' | 'marketplace' | 'configured' | 'generated';
    active: boolean;
    render_confirmed: boolean;
    registered_at: string;
    required_tokens: string[];
    description: string;
    version?: string;
}
export interface AutoRegisteredSkill {
    skill_id: string;
    artifact_types: string[];
    platform: string;
    ssr: boolean;
    generated_code: string;
    registered_at: string;
    source: 'tier_2_fallback';
    render_confirmed: boolean;
    complexity: import('@cactai-io/types').RenderingComplexity;
    model_tier: import('@cactai-io/types').GenerativeModelTier;
    generation_result_id: string;
}
export interface SkillInvocationPayload {
    descriptor: SkillDescriptor;
    artifact_data: unknown;
    theme: import('@cactai-io/themes').ThemeTokens;
    ssr: boolean;
    surface_config?: unknown;
}
export interface SkillInvocationResult {
    success: boolean;
    code?: string;
    component?: unknown;
    error?: string;
}
export interface ArtifactIndexEntry {
    id: string;
    type: string;
    subtype?: string;
    title?: string;
}
export interface SkillsManifest {
    package: string;
    version: string;
    framework: string;
    skills: SkillManifestEntry[];
}
export interface SkillManifestEntry {
    id: string;
    name: string;
    artifact_types: string[];
    platform: string;
    ssr: boolean;
    entry: string;
    required_tokens: string[];
    description: string;
}
export interface TurnRequest {
    input: string;
    turn_number: number;
    metadata?: Record<string, unknown>;
}
export interface MUIConfig {
    role?: import('@cactai-io/types').SessionRole;
    tenant_id?: string;
    session_id: string;
    project_id: string;
    api_base_url: string;
    platform: string;
    theme: import('@cactai-io/themes').ThemeTokens;
    skills_packages: SkillsManifest[];
    generation_bounds: import('@cactai-io/types').GenerationBounds;
    ssr: boolean;
    platform_api_key?: string;
    end_user_id?: string;
    personality_id_provider?: () => string | null | undefined;
    client_bridge?: {
        onMarketplaceSkillLoaded: (cb: (skill: {
            item_id: string;
            semver: string;
            bundle_sha256: string;
            artifact_types: string[];
            platform: string;
            component: unknown;
        }) => void) => () => void;
    };
}
