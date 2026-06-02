import type { CapabilityCatalogueItem, CapabilityScope, CapabilityScopeConfig, CapabilityConfigPatch } from '@cactai-io/types';
export interface CapabilityListPanelProps {
    scope: CapabilityScope;
    catalogue: CapabilityCatalogueItem[];
    config: CapabilityScopeConfig;
    allowHide: boolean;
    onPatch: (patch: CapabilityConfigPatch) => Promise<void>;
    only?: 'tool' | 'skill';
}
export declare function CapabilityListPanel({ scope, catalogue, config, allowHide, onPatch, only, }: CapabilityListPanelProps): import("react/jsx-runtime").JSX.Element;
