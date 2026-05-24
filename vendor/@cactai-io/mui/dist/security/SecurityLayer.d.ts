export declare function sanitizeHTML(dirty: string): string;
export declare function recordGesture(): void;
export declare function isGestureRecent(): boolean;
export declare function validateEscalation(payload: unknown): Record<string, unknown> | null;
export declare function createSandboxedFrame(code: string, themeTokensCSS: string, nonce: string): HTMLIFrameElement;
export declare function generateNonce(): string;
export declare function themeToCSS(tokens: Record<string, unknown>, prefix?: string): string;
export declare function isURLSafe(url: string): boolean;
