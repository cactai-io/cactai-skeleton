import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { HandoffSignal } from '@cactai-io/types';
interface SupportingSurfaceProps {
    signal: HandoffSignal;
    component: React.ComponentType<{
        config: unknown;
        theme: ThemeTokens;
    }> | null;
    theme: ThemeTokens;
    onClose: () => void;
}
export declare const SupportingSurface: React.FC<SupportingSurfaceProps>;
export {};
