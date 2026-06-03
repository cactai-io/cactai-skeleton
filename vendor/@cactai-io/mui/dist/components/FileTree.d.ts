import { type ReactNode } from 'react';
export type FileNodeStatus = 'clean' | 'modified' | 'new' | 'deleted' | 'renamed' | 'moved';
export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    status?: FileNodeStatus;
    new_path?: string;
    modified?: boolean;
    protected?: boolean;
    children?: FileNode[];
}
export interface FileTreeProps {
    nodes: FileNode[];
    activeFilePath?: string;
    onFileSelect: (path: string) => void;
    fileContent?: string | null;
    fileLoading?: boolean;
    onExitFileView?: () => void;
    onCollapse: () => void;
    uncommittedPaths?: ReadonlySet<string>;
    onCommitFile?: (path: string) => void;
    onRestore?: (path: string) => void;
    onUndoFile?: (path: string) => void;
    /** Create a new file at `path` with optional initial `content`. */
    onCreateFile?: (path: string, content?: string) => Promise<void> | void;
    /** Rename or move a file from `path` to `newPath`. */
    onRenameFile?: (path: string, newPath: string) => Promise<void> | void;
    /** Stage `path` for deletion on next commit. */
    onDeleteFile?: (path: string) => Promise<void> | void;
    /** Save edited content for the open file (stages an 'edit'). When set, the
     *  file view shows an Edit button that opens an inline editor. */
    onSaveFile?: (path: string, content: string) => Promise<void> | void;
}
declare function highlight(code: string, ext: string): ReactNode[];
declare function HighlightLine({ line, ext: _ext }: {
    line: string;
    ext: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function FileTree({ nodes, activeFilePath, onFileSelect, fileContent, fileLoading, onExitFileView, onCollapse, uncommittedPaths, onCommitFile, onRestore, onUndoFile, onCreateFile, onRenameFile, onDeleteFile, onSaveFile, }: FileTreeProps): import("react/jsx-runtime").JSX.Element;
export { highlight, HighlightLine };
