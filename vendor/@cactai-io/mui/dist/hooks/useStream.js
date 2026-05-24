'use client';
// packages/mui/src/hooks/useStream.ts
// SSE lifecycle hook. Binds StreamController to component lifecycle.
//
// Authority: MUI Architecture v0.2 Section 4
import { useEffect, useRef } from 'react';
export function useStream(controller) {
    const controllerRef = useRef(controller);
    controllerRef.current = controller;
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            controllerRef.current.disconnect();
        };
    }, []);
    return controllerRef.current;
}
//# sourceMappingURL=useStream.js.map