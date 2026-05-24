// packages/devshell/src/DevShellPage.tsx
// Entrypoint component the skeleton's /dev/page.tsx stub renders.
// The stub is responsible for:
//   1. Calling notFound() in production builds (defense in depth)
//   2. Authenticating the developer (requireDevRole)
//   3. Loading endpoints from the skeleton's @/lib/endpoints
//   4. Passing user + endpoint props to this component
//
// This component renders nothing of its own — it mounts DevShellProvider
// with the props the stub assembled.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { DevShellProvider } from './DevShellProvider.js';
export function DevShellPage(props) {
    return _jsx(DevShellProvider, { ...props });
}
