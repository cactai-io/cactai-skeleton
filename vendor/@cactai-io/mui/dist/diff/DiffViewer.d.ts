import type { PendingOperation } from '@cactai-io/types';
export interface DiffViewerProps {
    /** Repo-relative path of the file. Drives syntax highlighting via the
     *  file extension and is the cache key alongside the content. */
    path: string;
    /** Optional operation context. Used to special-case create/delete
     *  rendering — for those, one side of the diff is conceptually empty
     *  rather than missing. */
    operation?: PendingOperation;
    /** Pre-change content. Null for newly created files. */
    original: string | null;
    /** Post-change content. Null for deleted files. */
    current: string | null;
    /** Force the inline pre-formatted fallback instead of the full
     *  viewer. Defaults to false. Useful for tests / SSR. */
    fallbackOnly?: boolean;
    /** Initial split-vs-unified mode. Defaults to 'unified'. The viewer
     *  also offers an inline toggle that overrides this. */
    initialMode?: 'unified' | 'split';
}
export declare function clearDiffViewerCache(): void;
export declare function DiffViewer({ path, operation, original, current, fallbackOnly, initialMode, }: DiffViewerProps): import("react/jsx-runtime").JSX.Element;
export declare function languageForPath(path: string): string;
