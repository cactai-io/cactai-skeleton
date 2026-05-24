import type { CapabilityCatalogueItem, CapabilityScope, CapabilityScopeConfig, CapabilityConfigPatch } from '@cactai-io/types';
export interface CapabilityListPanelProps {
    scope: CapabilityScope;
    catalogue: CapabilityCatalogueItem[];
    config: CapabilityScopeConfig;
    allowHide: boolean;
    onPatch: (patch: CapabilityConfigPatch) => Promise<void>;
}
export declare function CapabilityListPanel({ scope, catalogue, config, allowHide, onPatch, }: CapabilityListPanelProps): import("react/jsx-runtime").JSX.Element;
