type SurfaceComponent = unknown;
export declare class SurfaceRegistry {
    private registry;
    register(surfaceType: string, component: SurfaceComponent): void;
    resolve(surfaceType: string): SurfaceComponent | undefined;
    has(surfaceType: string): boolean;
    listTypes(): string[];
}
export {};
