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
}
declare function highlight(code: string, ext: string): ReactNode[];
declare function HighlightLine({ line, ext: _ext }: {
    line: string;
    ext: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function FileTree({ nodes, activeFilePath, onFileSelect, fileContent, fileLoading, onExitFileView, onCollapse, uncommittedPaths, onCommitFile, onRestore, onUndoFile, }: FileTreeProps): import("react/jsx-runtime").JSX.Element;
export { highlight, HighlightLine };
