// packages/mui/src/surfaces/SurfaceRegistry.ts
// Static map: surface_type → component. Empty in MUI core.
// Product implementations register surface types at build time.
//
// Authority: MUI Architecture v0.2 Section 7
export class SurfaceRegistry {
    registry = new Map();
    // Product implementations call this at build time
    register(surfaceType, component) {
        this.registry.set(surfaceType, component);
    }
    // Resolve surface_type from HandoffSignal to component
    resolve(surfaceType) {
        return this.registry.get(surfaceType);
    }
    has(surfaceType) {
        return this.registry.has(surfaceType);
    }
    // List all registered surface types
    listTypes() {
        return Array.from(this.registry.keys());
    }
}
//# sourceMappingURL=SurfaceRegistry.js.map