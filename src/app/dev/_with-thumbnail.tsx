// src/app/dev/_with-thumbnail.tsx
//
// Client wrapper that mounts the rich DevShell IDE AND installs the
// platform thumbnail capture handlers. The server-side dev/page.tsx
// can't do either — effects need a client component, and the dynamic
// import must run client-side so the prod tree-shake can drop the
// devshell bundle entirely.
//
// Mount target: SelfDrivenDevShell from @cactai-io/devshell. That
// wrapper internally initializes MUIShell, opens a platform session,
// and renders the full DevShell IDE chrome (top bar, rail, panels)
// from @cactai-io/mui. The customer app passes only auth + identity;
// everything else (file tree, commits, panels) is fetched by the
// wrapper from the platform via the /api/cactai same-origin proxy.
//
// Thumbnail capture cadence per locked spec: once at sign-on (mount),
// once at sign-off / tab close. No periodic re-capture. See
// ../../lib/capture-thumbnail.ts for the upload logic.

'use client';

import React, { useEffect, useState } from 'react';
import { installCaptureHandlers } from '@/lib/capture-thumbnail';

interface Props {
  userId:      string;
  userEmail:   string;
  userRole:    string;
  allRoles:    Array<{ role: string }>;
  cactaiBase:  string;   // real api.cactai.io URL — used only by the thumbnail uploader
  projectId:   string;
  /** Project's display name (from platform projects.name). Server-side
   *  fetched in page.tsx and passed here so the IDE topbar shows the
   *  developer's chosen name instead of the literal 'App' fallback. */
  projectName: string;
}

export const DevShellWithThumbnail: React.FC<Props> = (props) => {
  // Install thumbnail capture handlers. SSR mount returns null; the
  // effect attaches on hydration.
  useEffect(() => {
    return installCaptureHandlers({
      cactaiBase: props.cactaiBase,
      projectId:  props.projectId,
      kind:       'preview',
    });
  }, [props.cactaiBase, props.projectId]);

  // Lazy-load the IDE on the client. @cactai-io/devshell is gated to
  // non-production via the layout's notFound() guard; importing
  // dynamically lets the production bundle tree-shake it.
  //
  // Holder shape ({ Comp }) sidesteps React's useState updater overload
  // — setShell(MyComp) would call MyComp() with the prev state because
  // a React component IS a function.
  type SelfDrivenDevShellType = React.ComponentType<{
    cactaiBase:    string;
    projectId:     string;
    projectName?:  string;
    userId:        string;
    userEmail:     string;
    userRole:      string;
    allRoles:      Array<{ role: string; tenant_id: string | null }>;
    dashboardUrl?: string;
    productionUrl?: string;
  }>;
  const [shell, setShell] = useState<{ Comp: SelfDrivenDevShellType } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = await import('@cactai-io/devshell');
      if (!cancelled) setShell({ Comp: mod.SelfDrivenDevShell as SelfDrivenDevShellType });
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

  // Pass minimal props. The wrapper opens the platform session, builds
  // MUIShell, and supplies its own empty defaults for the panel data
  // surfaces until Phase 2 wires those to real fetches.
  //
  // cactaiBase here is the SAME-ORIGIN PROXY mount, not the real
  // api.cactai.io URL: every platform call from DevShell lands at
  // /api/cactai/<path> on this Vercel deploy, the route attaches the
  // project's CACTAI_API_KEY server-side, and forwards to the
  // platform with the AI provider key (from customer DB BYOK)
  // injected into the body. That keeps CACTAI_API_KEY and the AI
  // provider key out of the browser bundle.
  //
  // The thumbnail uploader above uses the REAL cactaiBase prop
  // because /v1/project-thumbnails/* is permissive-CORS'd and uses
  // the project_id as the credential (no Bearer needed).
  const { Comp } = shell;
  // Pass-through cast of allRoles to satisfy the wrapper's tenant_id
  // shape — the skeleton's session_user.all_roles already carries
  // tenant_id, the wrapper interface just spells it explicitly.
  const richRoles = (props.allRoles ?? []).map(r => ({
    role:      r.role,
    tenant_id: (r as { tenant_id?: string | null }).tenant_id ?? null,
  }));
  // NEXT_PUBLIC_SITE_URL is inlined at build time by Next when read via
  // dot-notation. The wrapper uses this to wire the Workspace panel's
  // "Open app" button to the live deployment.
  const productionUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return (
    <Comp
      cactaiBase="/api/cactai"
      projectId={props.projectId}
      projectName={props.projectName}
      userId={props.userId}
      userEmail={props.userEmail}
      userRole={props.userRole}
      allRoles={richRoles}
      productionUrl={productionUrl}
    />
  );
};
