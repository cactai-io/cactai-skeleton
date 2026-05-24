'use client';
// packages/mui/src/hooks/useMUIStore.ts
// Store access hook. Components derive from MUIStore only.
//
// Authority: MUI Architecture v0.2 Section 5
import { useState, useEffect } from 'react';
export function useMUIStore(store) {
    const [state, setState] = useState(store.getState());
    useEffect(() => {
        const unsub = store.subscribe(() => {
            setState(store.getState());
        });
        return unsub;
    }, [store]);
    return state;
}
export function useMUIStoreSelector(store, selector) {
    const [value, setValue] = useState(() => selector(store.getState()));
    useEffect(() => {
        const unsub = store.subscribe(() => {
            const next = selector(store.getState());
            setValue(next);
        });
        return unsub;
    }, [store, selector]);
    return value;
}
//# sourceMappingURL=useMUIStore.js.map