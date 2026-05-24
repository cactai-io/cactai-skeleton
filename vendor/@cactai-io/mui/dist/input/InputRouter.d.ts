import type { GASInputPayload } from '@cactai-io/types';
import { MUIStore } from '../store/MUIStore.js';
import { StreamController } from '../stream/StreamController.js';
export declare class InputRouter {
    private store;
    private streamController;
    private apiBaseUrl;
    constructor(store: MUIStore, streamController: StreamController, apiBaseUrl: string);
    dispatch(payload: GASInputPayload): Promise<void>;
}
