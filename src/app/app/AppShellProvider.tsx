// src/app/app/AppShellProvider.tsx
// App-shell client. Wraps the developer's deployed app for end users.
// Owns no agent logic — the developer's pages render whatever the
// platform sends back as a primitive tree, and forward user events.

'use client';

import { endpoints } from '@/lib/endpoints';
import { useEffect, useRef, useState, useCallback } from 'react';
import { CactaiClient } from '@cactai-io/client';
import { PrimitiveTreeRenderer, type PrimitiveNode } from '@cactai-io/primitives';
import { SAMTheme } from '@cactai-io/themes';
import { SupportLauncher } from './SupportLauncher.client';
import type { SessionUser } from '@/lib/auth';

interface AppShellProviderProps {
  user:     SessionUser;
  children: React.ReactNode;
}

export function AppShellProvider({ user, children }: AppShellProviderProps) {
  const [client,    setClient]    = useState<CactaiClient | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tree,      setTree]      = useState<PrimitiveNode | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const c = new CactaiClient({
      base_url:   endpoints.cactaiBase,
      project_id: endpoints.projectId,
    });
    setClient(c);
    (async () => {
      try {
        const session = await c.openSession({
          shell:      'app',
          user_id:    user.id,
          user_role:  user.active_lens ?? undefined,
          tenant_id:  user.tenant_id ?? undefined,
          viewport:   typeof window === 'undefined' ? null : {
            width:  window.screen.width,
            height: window.screen.height,
            dpr:    window.devicePixelRatio,
          },
        });
        setSessionId(session.session_id);
        setTree(session.initial_tree ?? null);
      } catch (err) {
        console.error('AppShell session open failed:', err);
      }
    })();
  }, [user]);

  const postEvent = useCallback(async (target_id: string, payload?: unknown) => {
    if (!client || !sessionId) return;
    try {
      const next = await client.postEvent({ session_id: sessionId, target_id, payload });
      if (next.tree) setTree(next.tree);
    } catch (err) {
      console.error('Event post failed:', err);
    }
  }, [client, sessionId]);

  // v1.3.5 — Report and Regenerate callbacks wired into the primitive
  // runtime so the skill_envelope's buttons reach the platform. Report
  // does not change what the user sees; Regenerate replaces only the
  // rendered tree's matching skill in place (no version history kept).
  const onReportSkill = useCallback(
    async (
      meta: { skill_id: string; source: string; artifact_type?: string; platform?: string },
      note: string | null,
    ) => {
      if (!client) return;
      try {
        await client.reportSkill({
          skill_id:      meta.skill_id,
          skill_source:  meta.source as Parameters<typeof client.reportSkill>[0]['skill_source'],
          artifact_type: meta.artifact_type,
          platform:      meta.platform,
          session_id:    sessionId ?? undefined,
          note,
        });
      } catch (err) {
        console.error('reportSkill failed:', err);
      }
    },
    [client, sessionId],
  );
  const onRegenerateSkill = useCallback(
    async (_meta: { skill_id: string; source: string; artifact_type?: string; platform?: string }) => {
      // v1: Regenerate is wired through but the deployed-app needs the
      // original surface inputs to replay generation. Those are owned by
      // the skill renderer that produced the current view, not by the
      // envelope. A follow-up will plumb the regenerate_payload through
      // skill_meta; for v1 we surface the button (visibility correct) and
      // ship the network method on CactaiClient (CactaiClient#regenerateSkill).
      // Skipping a no-op call here means click currently surfaces a
      // user-visible "Regenerated." confirmation only when the host has
      // actually wired the payload — leaving room to layer it on without
      // changing the envelope or the runtime contract.
    },
    [],
  );

  // The developer's app pages render alongside the agent's primitive tree.
  // Children come from the developer's own page code; the tree is what the
  // platform sends back per turn. Layout below is the developer's choice.
  return (
    <div style={{
      minHeight:  '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: 'var(--app-bg, #ffffff)',
      color:      'var(--app-text, #111111)',
    }}>
      {children}
      {tree && (
        <PrimitiveTreeRenderer
          root={tree}
          theme={SAMTheme.tokens}
          postEvent={postEvent}
          onReportSkill={onReportSkill}
          onRegenerateSkill={onRegenerateSkill}
        />
      )}
      {/* Minimum-required support affordance: a self-contained launcher →
          create-ticket + two-way chat modal. The developer can relocate this
          into their own app's avatar menu; it ships on by default so every app
          has support discoverable on day one. */}
      <SupportLauncher />
    </div>
  );
}
