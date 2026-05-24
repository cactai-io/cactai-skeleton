import { MUIStore } from '../store/MUIStore.js';
export type HandoffHandler = (signal: import('@cactai-io/types').HandoffSignal) => void;
export declare class StreamController {
    private eventSource;
    private store;
    private apiBaseUrl;
    private onHandoff;
    constructor(store: MUIStore, apiBaseUrl: string, onHandoff: HandoffHandler);
    connect(requestId: string): void;
    disconnect(): void;
    private ingest;
    private handleOutputDelta;
    private handleHandoffSignal;
    private handleTurnComplete;
    private handleTurnError;
}
