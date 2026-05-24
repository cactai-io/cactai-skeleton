// packages/mui/src/generation/GenerativeFallback.ts
// Tier 2 — thin HTTP wrapper around the platform's /v1/skills/generate
// endpoint. The actual generation MECHANISM (prompt construction, model
// resolution + call, safety analyzer, complexity assessor, quarantine
// capture) lives server-side under apps/api/src/skills/ and is Cactai IP.
//
// Pre-v1.3.5 this class held the Anthropic API key, built the prompt, and
// called https://api.anthropic.com/v1/messages directly from the browser.
// That exposed the prompt structure (IP), shipped the key through any
// network proxy in front of the browser, and burned the key from a
// client context. v1.3.5 moves all of that to the server. This file is
// now a transport — it serializes the inputs, posts to the platform, and
// returns the response.
//
// Authority: MUI Doctrine v1.2 Section XV.1 (Tier 2), XV.7. v1.3.5 amendment:
// generation executes server-side; the client wrapper is transport only.
export class GenerativeFallback {
    platform;
    theme;
    bounds;
    apiBaseUrl;
    apiKey;
    endUserId;
    constructor(platform, theme, bounds, apiBaseUrl, apiKey, endUserId) {
        this.platform = platform;
        this.theme = theme;
        this.bounds = bounds;
        this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
        this.endUserId = endUserId;
    }
    // Generate novel UI code for an artifact type. Called by MUI Shell when
    // RenderDecision.tier === 2. The browser sends the SHAPE of the data it
    // wants rendered; the server returns generated code + the complexity
    // assessment that drove model selection.
    async generate(_assessment, artifactData, surfaceConfig, artifactType) {
        const surfaceType = artifactType ?? this.inferSurfaceType(artifactData, surfaceConfig);
        const skillIdFallback = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        try {
            const res = await fetch(`${this.apiBaseUrl}/v1/skills/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    artifact_type: artifactType ?? surfaceType,
                    surface_type: surfaceType,
                    platform: this.platform,
                    ssr: false,
                    artifact_data: artifactData,
                    theme_tokens: this.theme,
                    composition_rules: this.bounds.composition_rules,
                    surface_config: surfaceConfig,
                    end_user_id: this.endUserId,
                }),
            });
            if (!res.ok) {
                return this.emptyResult(skillIdFallback, 'haiku_4_5', [`platform_returned_${res.status}`]);
            }
            const data = await res.json();
            return {
                skill_id: data.skill_id ?? skillIdFallback,
                model_tier: data.model_tier ?? 'haiku_4_5',
                platform: this.platform,
                code: data.code ?? '',
                render_confirmed: false,
                reported: false,
                generated_at: (data.generated_at ?? new Date().toISOString()),
                ...(data.rejection_reasons && data.rejection_reasons.length > 0
                    ? { rejection_reasons: data.rejection_reasons }
                    : {}),
            };
        }
        catch (err) {
            return this.emptyResult(skillIdFallback, 'haiku_4_5', [`network_error: ${err.message}`]);
        }
    }
    emptyResult(skillId, tier, reasons) {
        return {
            skill_id: skillId,
            model_tier: tier,
            platform: this.platform,
            code: '',
            render_confirmed: false,
            reported: false,
            generated_at: new Date().toISOString(),
            rejection_reasons: reasons,
        };
    }
    inferSurfaceType(_data, config) {
        const c = config;
        return c?.surface_type ?? 'unknown';
    }
}
//# sourceMappingURL=GenerativeFallback.js.map