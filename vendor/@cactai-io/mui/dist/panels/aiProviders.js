// packages/mui/src/panels/aiProviders.ts
//
// Shared projection of PROVIDER_REGISTRY for the AI configuration surfaces.
// Both App Configuration → AI (keys policy + budgets) and DevShell
// Configuration → AI (developer's own keys + budgets) render from this same
// real catalogue, so the two stay in lockstep with the resolver's source of
// truth. Budget units are provider-native (no lossy dollar conversion).
import { PROVIDER_REGISTRY } from '@cactai-io/types';
// The generative / metered categories that consume AI spend — the providers
// the budget + keys surfaces care about. Excludes infra (deployment),
// identity, productivity, payments, sms, email — those are integrations.
export const AI_BUDGET_CATEGORIES = [
    'ai', 'search', 'media_generation', 'video_generation', 'avatar_generation',
    'audio_generation', 'synthetic_data', 'character_generation', 'motion_capture',
    'npc_intelligence', 'transcription', 'translation', 'threed_generation',
];
export const CATEGORY_LABEL = {
    ai: 'Text & reasoning', search: 'Search', media_generation: 'Image generation',
    video_generation: 'Video generation', avatar_generation: 'Avatar / presenter video',
    audio_generation: 'Audio generation', synthetic_data: 'Synthetic data',
    character_generation: 'Character generation', motion_capture: 'Motion capture',
    npc_intelligence: 'NPC intelligence', transcription: 'Transcription',
    translation: 'Translation', threed_generation: '3D generation',
};
export const BUDGET_UNIT = {
    ai: 'tokens / mo', search: 'queries / mo', media_generation: 'images / mo',
    video_generation: 'seconds / mo', avatar_generation: 'seconds / mo',
    audio_generation: 'seconds / mo', synthetic_data: 'records / mo',
    character_generation: 'models / mo', motion_capture: 'minutes / mo',
    npc_intelligence: 'messages / mo', transcription: 'minutes / mo',
    translation: 'characters / mo', threed_generation: 'models / mo',
};
/** The metered AI providers grouped by category, in AI_BUDGET_CATEGORIES order. */
export function groupAIProviders() {
    const byCat = new Map();
    for (const p of Object.values(PROVIDER_REGISTRY)) {
        if (!AI_BUDGET_CATEGORIES.includes(p.category))
            continue;
        const arr = byCat.get(p.category) ?? [];
        arr.push({ id: p.id, name: p.name });
        byCat.set(p.category, arr);
    }
    return AI_BUDGET_CATEGORIES.filter(c => byCat.has(c)).map(c => ({ category: c, providers: byCat.get(c) }));
}
//# sourceMappingURL=aiProviders.js.map