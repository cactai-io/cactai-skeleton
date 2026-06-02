import type { CapabilityCatalogueItem, CapabilityScopeConfig, CapabilityConfigPatch } from '@cactai-io/types';
export interface DevShellPreferencesModalProps {
    catalogue: CapabilityCatalogueItem[];
    config: CapabilityScopeConfig;
    onPatch: (patch: CapabilityConfigPatch) => Promise<void>;
    onClose: () => void;
    /** 'modal' (legacy overlay) or 'page' (full-page main-area view). The
     *  DevShell mounts this as a 'page' inside the workspace content area;
     *  'modal' is kept for any incidental overlay use. */
    variant?: 'modal' | 'page';
}
export declare function DevShellPreferencesModal({ catalogue, config, onPatch, onClose, variant }: DevShellPreferencesModalProps): import("react/jsx-runtime").JSX.Element;
