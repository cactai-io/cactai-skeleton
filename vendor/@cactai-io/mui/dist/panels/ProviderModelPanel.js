'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PROVIDER_REGISTRY, resolverToProviderCapability, getProviderSelectionKind, } from '@cactai-io/types';
/** Predicate the host uses to gate Continue / Save. Returns true when every
 *  required capability has both a provider_id and a selection picked. */
export function isProviderModelComplete(required, value) {
    if (!required || required.length === 0)
        return true;
    return required.every(c => {
        const v = value[c];
        return !!(v && v.provider_id && v.selection);
    });
}
// Curate the providers that can serve a given capability. 'gen' is a
// routing-fallback marker; for the "what providers can serve this?" UI we
// surface every provider that declares any generative-style capability so
// the dev can pick a default. Specific gen.<subkind> entries restrict to
// the matching provider capability.
function providersForCapability(cap) {
    if (cap === 'gen') {
        // Union of every generative capability — the dev picks a "default
        // generative" provider; specific gen.<subkind> overrides happen on
        // their own row.
        const generative = new Set([
            'image_generation', 'transcription', 'tts', 'embeddings', 'threed_generation',
            'translation', 'video_generation', 'avatar_video', 'motion_capture',
            'npc_intelligence', 'character_generation', 'synthetic_data',
        ]);
        return Object.values(PROVIDER_REGISTRY).filter(p => p.capabilities.some(c => generative.has(c)));
    }
    const target = resolverToProviderCapability(cap);
    if (!target)
        return [];
    return Object.values(PROVIDER_REGISTRY).filter(p => p.capabilities.includes(target));
}
function capabilityLabel(cap) {
    switch (cap) {
        case 'chat': return 'Chat';
        case 'gen': return 'Generative (default)';
        case 'gen.image': return 'Image generation';
        case 'gen.audio_transcription': return 'Audio transcription';
        case 'gen.audio_synthesis': return 'Text-to-speech';
        case 'gen.embeddings': return 'Embeddings';
        case 'gen.threed': return '3D generation';
        case 'gen.translation': return 'Translation';
        case 'gen.video': return 'Video generation';
        case 'gen.avatar': return 'Avatar / talking-head';
        case 'gen.motion_capture': return 'Motion capture';
        case 'gen.npc_intelligence': return 'NPC intelligence';
        case 'gen.character_generation': return 'Character generation';
        case 'gen.synthetic_data': return 'Synthetic data';
    }
}
function capabilityHelper(cap, owner) {
    if (cap === 'chat')
        return owner === 'user'
            ? 'Powers the chat surface you see in this app.'
            : 'Powers the chat surface in DevShell and the deployed app.';
    if (cap === 'gen')
        return owner === 'user'
            ? 'Default for every generative call (image, audio, etc.) unless overridden below.'
            : 'Default for every generative call. Per-capability overrides ship on their own rows.';
    return 'Override the generative default for this specific capability.';
}
export function ProviderModelPanel({ owner, capabilities, value, onChange, required, appShadow, variant = 'full', selections, }) {
    const compact = variant === 'compact';
    const requiredSet = new Set(required ?? []);
    const setPick = (cap, patch) => {
        const cur = value[cap] ?? { provider_id: null, selection: null };
        // Changing the provider invalidates the prior selection — the catalog
        // changes per provider. Caller can re-set if appropriate.
        const nextPick = patch.provider_id !== undefined && patch.provider_id !== cur.provider_id
            ? { provider_id: patch.provider_id ?? null, selection: null }
            : { ...cur, ...patch };
        onChange({ ...value, [cap]: nextPick });
    };
    if (capabilities.length === 0) {
        return (_jsx("div", { style: { padding: compact ? 12 : 20, fontSize: 12.5, color: 'var(--ds-text-3)' }, children: "No capabilities to configure." }));
    }
    return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: compact ? 12 : 16, padding: compact ? 0 : 20 }, children: capabilities.map(cap => {
            const cur = value[cap] ?? { provider_id: null, selection: null };
            const isReq = requiredSet.has(cap);
            const missing = isReq && (!cur.provider_id || !cur.selection);
            const provs = providersForCapability(cap);
            const shadow = owner === 'user' ? appShadow?.[cap] : undefined;
            const selectionKind = cur.provider_id && PROVIDER_REGISTRY[cur.provider_id]
                ? getProviderSelectionKind(PROVIDER_REGISTRY[cur.provider_id])
                : 'model';
            const catalog = (cur.provider_id && selections?.[cur.provider_id]) ?? null;
            return (_jsxs("div", { style: {
                    background: 'var(--ds-surface, #13131F)',
                    border: '1px solid var(--ds-border, #25253A)',
                    borderRadius: 8,
                    padding: compact ? '10px 12px' : '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: compact ? 8 : 10,
                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }, children: [_jsx("span", { style: { fontSize: compact ? 12.5 : 13, fontWeight: 600, color: 'var(--ds-text)' }, children: capabilityLabel(cap) }), missing && (_jsx("span", { style: { fontSize: 10, color: '#F5B544' }, children: "Required" }))] }), _jsx("div", { style: { fontSize: 11, color: 'var(--ds-text-3)', lineHeight: 1.5 }, children: capabilityHelper(cap, owner) }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-2)' }, children: "Provider" }), _jsxs("select", { value: cur.provider_id ?? '', onChange: e => setPick(cap, { provider_id: e.target.value || null }), style: {
                                    padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit',
                                    background: 'var(--ds-elevated, #1B1B2A)', color: 'var(--ds-text)',
                                    border: `1px solid ${cur.provider_id ? 'var(--ds-border)' : '#F5B544'}`,
                                    borderRadius: 6,
                                }, children: [_jsx("option", { value: "", children: "\u2014 Pick a provider \u2014" }), provs.map(p => (_jsx("option", { value: p.id, children: p.name }, p.id)))] })] }), cur.provider_id && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--ds-text-2)', textTransform: 'capitalize' }, children: selectionKind }), catalog ? (_jsxs("select", { value: cur.selection ?? '', onChange: e => setPick(cap, { selection: e.target.value || null }), style: {
                                    padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit',
                                    background: 'var(--ds-elevated, #1B1B2A)', color: 'var(--ds-text)',
                                    border: `1px solid ${cur.selection ? 'var(--ds-border)' : '#F5B544'}`,
                                    borderRadius: 6,
                                }, children: [_jsxs("option", { value: "", children: ["\u2014 Pick a ", selectionKind, " \u2014"] }), catalog.map(m => (_jsx("option", { value: m.id, title: m.hint, children: m.label }, m.id)))] })) : (_jsx("input", { value: cur.selection ?? '', onChange: e => setPick(cap, { selection: e.target.value || null }), placeholder: `${selectionKind} id (paste from provider docs)`, style: {
                                    padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit',
                                    background: 'var(--ds-elevated, #1B1B2A)', color: 'var(--ds-text)',
                                    border: `1px solid ${cur.selection ? 'var(--ds-border)' : '#F5B544'}`,
                                    borderRadius: 6,
                                } }))] })), shadow && (shadow.provider_id || shadow.selection) && (_jsxs("div", { style: { fontSize: 10.5, color: 'var(--ds-text-3)', fontStyle: 'italic', marginTop: 2 }, children: ["Your developer's default:\u00A0", shadow.provider_id ? (PROVIDER_REGISTRY[shadow.provider_id]?.name ?? shadow.provider_id) : '—', shadow.selection ? ` · ${shadow.selection}` : ''] }))] }, cap));
        }) }));
}
// ── Per-provider catalog of "common" selections — used by hosts that want
//    a dropdown rather than free-text. Each entry maps provider_id to the
//    locked tier set per docs/ai-provider-architecture.md. Hosts pass this
//    to <ProviderModelPanel selections={DEFAULT_SELECTIONS} />.
//
//    Editing this list = update the locked spec first. Adding a new
//    provider does not require touching this; the input falls back to
//    free-text when no entry exists. ──────────────────────────────────────
export const DEFAULT_SELECTIONS = {
    'ai.anthropic': [
        { id: 'claude-haiku-4-5', label: 'Haiku', hint: 'Fastest, lowest cost.' },
        { id: 'claude-sonnet-4-6', label: 'Sonnet', hint: 'Balanced. Default chat target.' },
        { id: 'claude-opus-4-7', label: 'Opus', hint: 'Highest reasoning. Default generative target.' },
    ],
    'ai.openai': [
        { id: 'gpt-5-nano', label: 'GPT-5 nano', hint: 'Fastest, lowest cost.' },
        { id: 'gpt-5-mini', label: 'GPT-5 mini', hint: 'Balanced.' },
        { id: 'gpt-5', label: 'GPT-5', hint: 'Highest reasoning.' },
    ],
};
export default ProviderModelPanel;
//# sourceMappingURL=ProviderModelPanel.js.map