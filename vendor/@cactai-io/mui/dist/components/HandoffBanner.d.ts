import React from 'react';
import type { ThemeTokens } from '@cactai-io/themes';
import type { HandoffSignal } from '@cactai-io/types';
interface HandoffBannerProps {
    signal: HandoffSignal;
    theme: ThemeTokens;
    onHandoffAck: (signal: HandoffSignal) => void;
}
export declare const HandoffBanner: React.FC<HandoffBannerProps>;
export {};
