// src/app/dev/_with-thumbnail.tsx
// Client wrapper that mounts the @cactai-io/devshell page AND installs
// the platform thumbnail capture handlers. The server-side dev/page.tsx
// can't do either (effects need a client component; the dynamic import
// must run client-side for production tree-shaking to drop the bundle).
//
// Capture cadence per locked spec: once at sign-on (mount), once on
// sign-off / tab close. No periodic re-capture. See ../../lib/
// capture-thumbnail.ts for the actual capture + upload logic.

'use client';

import React, { useEffect, useState } from 'react';
import { installCaptureHandlers } from '@/lib/capture-thumbnail';

interface Props {
  userId:     string;
  userEmail:  string;
  userRole:   string;
  allRoles:   Array<{ role: string }>;
  cactaiBase: string;
  projectId:  string;
}

export const DevShellWithThumbnail: React.FC<Props> = (props) => {
  // Install thumbnail capture handlers. Runs only client-side; SSR
  // mount returns null and useEffect attaches on hydration.
  useEffect(() => {
    return installCaptureHandlers({
      cactaiBase: props.cactaiBase,
      projectId:  props.projectId,
      kind:       'preview',
    });
  }, [props.cactaiBase, props.projectId]);

  // Lazy-load DevShellPage on the client. We can't statically import
  // @cactai-io/devshell here because the package is a devDependency
  // gated to non-production; the dynamic import is what lets the
  // production bundle tree-shake the dep entirely.
  //
  // Wrapped in an object holder because React's useState setter treats a
  // function argument as an updater, and a component IS a function — so
  // setComponent(MyComp) would call MyComp() with the prev state. The
  // {Comp} wrapper sidesteps that ambiguity.
  type DevShellPageType = React.ComponentType<{
    userId:           string;
    userEmail:        string;
    userRole:         string;
    allRoles:         Array<{ role: string }>;
    endpoints:        { cactaiBase: string; projectId: string };
    preferencesHref?: string;
  }>;
  const [shell, setShell] = useState<{ Comp: DevShellPageType } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = await import('@cactai-io/devshell');
      if (!cancelled) setShell({ Comp: mod.DevShellPage as DevShellPageType });
    })();
    return () => { cancelled = true; };
  }, []);

  if (!shell) {
    return (
      <div style={{
        padding: 40, color: 'var(--c-text-3, #888)',
        fontFamily: 'var(--f-ui, system-ui)',
      }}>
        Loading DevShell…
      </div>
    );
  }

  const { Comp } = shell;
  return (
    <Comp
      userId={props.userId}
      userEmail={props.userEmail}
      userRole={props.userRole}
      allRoles={props.allRoles}
      endpoints={{
        // Same-origin proxy. DevShell's CactaiClient hits
        // /api/cactai/v1/shell/... and the server-side route attaches
        // the CACTAI_API_KEY Bearer + forwards to the real platform.
        // Direct cross-origin calls to api.cactai.io would fail CORS
        // (no Allow-Credentials for *.vercel.app origins) and 401
        // (CactaiClient sends no Bearer when no api_key is configured).
        // The thumbnail capture above uses the real cactaiBase
        // because /v1/project-thumbnails/* is permissive-CORS'd and
        // takes the project_id as the credential.
        cactaiBase: '/api/cactai',
        projectId:  props.projectId,
      }}
      preferencesHref="/dev/preferences"
    />
  );
};
