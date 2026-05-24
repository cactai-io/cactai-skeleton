import type { MUIStore as MUIStoreShape } from '@cactai-io/types';
import type { MUIStore } from '../store/MUIStore.js';
export declare function useMUIStore(store: MUIStore): Readonly<MUIStoreShape>;
export declare function useMUIStoreSelector<T>(store: MUIStore, selector: (state: MUIStoreShape) => T): T;
