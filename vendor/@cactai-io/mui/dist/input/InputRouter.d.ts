import type { GASInputPayload } from '@cactai-io/types';
import { MUIStore } from '../store/MUIStore.js';
import { StreamController } from '../stream/StreamController.js';
export declare class InputRouter {
    private store;
    private streamController;
    private apiBaseUrl;
    private endUserId;
    private personalityIdProvider;
    constructor(store: MUIStore, streamController: StreamController, apiBaseUrl: string, endUserId?: string, personalityIdProvider?: () => string | null | undefined);
    dispatch(payload: GASInputPayload): Promise<void>;
}
