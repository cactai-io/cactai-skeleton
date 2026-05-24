import type { MUIStore as MUIStoreShape, OutputResponse, SSETextDelta, ArtifactObject, GASErrorType, SurfaceRecord, MUISurfaceType } from '@cactai-io/types';
import type { DeviceContext, SkillDescriptor } from '../types/mui.types.js';
type Listener = () => void;
export declare class MUIStore {
    private state;
    private listeners;
    private deviceContext;
    private skillsLibrary;
    constructor(session_id: string, device: DeviceContext);
    getState(): Readonly<MUIStoreShape>;
    getDevice(): Readonly<DeviceContext>;
    getSkillsLibrary(): Readonly<SkillDescriptor[]>;
    subscribe(listener: Listener): () => void;
    private notify;
    incrementTurnCount(): number;
    setPending(pending: boolean): void;
    setStreaming(streaming: boolean): void;
    appendStreamDelta(delta: SSETextDelta): void;
    clearStreamBuffer(): void;
    appendMessage(message: OutputResponse): void;
    registerArtifact(artifact: ArtifactObject): void;
    setActiveError(error: GASErrorType | null): void;
    setActiveSurface(surface: MUISurfaceType): void;
    setSupportingType(type: string | null): void;
    pushSurface(record: SurfaceRecord): void;
    updateDevice(device: Partial<DeviceContext>): void;
    setSkillsLibrary(skills: SkillDescriptor[]): void;
}
export {};
