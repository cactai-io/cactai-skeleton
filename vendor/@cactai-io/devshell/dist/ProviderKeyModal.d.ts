import type { ProviderCapabilityFailure } from '@cactai-io/client';
import type { DevShellEndpoints } from './DevShellProvider.js';
interface Props {
    detail: ProviderCapabilityFailure;
    endpoints: DevShellEndpoints;
    /** Called after a successful save. The caller replays the original
     *  request — the modal does NOT close itself first; the caller closes
     *  it as part of the retry handler so the spinner stays visible if the
     *  replay also fails. */
    onSaved: () => Promise<void>;
    onDismiss: () => void;
}
export declare function ProviderKeyModal({ detail, endpoints, onSaved, onDismiss }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ProviderKeyModal.d.ts.map