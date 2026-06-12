import React from 'react';
import { type ResolverCapability } from '@cactai-io/types';
export type Owner = 'dev' | 'app' | 'user';
export interface ProviderModelPick {
    provider_id: string | null;
    selection: string | null;
}
export type ProviderModelValue = Record<string, ProviderModelPick>;
export interface ProviderModelPanelProps {
    owner: Owner;
    capabilities: ResolverCapability[];
    value: ProviderModelValue;
    onChange: (next: ProviderModelValue) => void;
    required?: ResolverCapability[];
    /** Only meaningful when owner === 'user'. Per-capability "this is what
     *  your developer picked" hint shown above the user's own selectors. */
    appShadow?: ProviderModelValue;
    /** Compact layout for inline surfaces (build wizard step card); full
     *  layout for dedicated tabs (DevShell Config). Defaults to 'full'. */
    variant?: 'compact' | 'full';
    /** Per-provider catalog of available selections. Keyed by provider_id.
     *  When omitted for a given provider, the row falls back to a free-text
     *  input so a dev can paste an arbitrary id (model name, voice id, etc.).
     *
     *  This is intentionally injected by the host instead of hardcoded —
     *  Anthropic's model list lives somewhere different than ElevenLabs'
     *  voice list lives different than Replicate's checkpoint list. */
    selections?: Record<string, ReadonlyArray<{
        id: string;
        label: string;
        hint?: string;
    }>>;
}
/** Predicate the host uses to gate Continue / Save. Returns true when every
 *  required capability has both a provider_id and a selection picked. */
export declare function isProviderModelComplete(required: ResolverCapability[] | undefined, value: ProviderModelValue): boolean;
export declare function ProviderModelPanel({ owner, capabilities, value, onChange, required, appShadow, variant, selections, }: ProviderModelPanelProps): React.ReactElement;
export declare const DEFAULT_SELECTIONS: Record<string, ReadonlyArray<{
    id: string;
    label: string;
    hint?: string;
}>>;
export default ProviderModelPanel;
