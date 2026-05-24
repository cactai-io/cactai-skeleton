import type { MUIStore } from '../store/MUIStore.js';
export declare function useGASSession(store: MUIStore): {
    session_id: string;
    turn_count: number;
    morph_state: import("packages/types/dist/index.js").MUISurfaceType;
    pending: boolean;
    streaming: boolean;
    hasError: boolean;
    messageCount: number;
};
