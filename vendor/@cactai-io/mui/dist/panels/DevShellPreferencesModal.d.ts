import type { CapabilityCatalogueItem, CapabilityScopeConfig, CapabilityConfigPatch } from '@cactai-io/types';
export interface DevShellPreferencesModalProps {
    catalogue: CapabilityCatalogueItem[];
    config: CapabilityScopeConfig;
    onPatch: (patch: CapabilityConfigPatch) => Promise<void>;
    onClose: () => void;
}
export declare function DevShellPreferencesModal({ catalogue, config, onPatch, onClose }: DevShellPreferencesModalProps): import("react/jsx-runtime").JSX.Element;
