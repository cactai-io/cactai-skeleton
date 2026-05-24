export interface ThemeInspectorProps {
    projectId: string;
    apiBaseUrl: string;
    onClose: () => void;
    /**
     * URL pointing at the skeleton's `/_studio/preview` route on the dev's
     * Vercel preview deployment. When absent, the preview column shows a
     * "preview unavailable" placeholder.
     */
    previewUrl?: string;
}
export declare function ThemeInspector({ projectId, apiBaseUrl, onClose, previewUrl, }: ThemeInspectorProps): import("react/jsx-runtime").JSX.Element;
