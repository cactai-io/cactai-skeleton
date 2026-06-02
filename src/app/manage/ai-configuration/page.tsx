// src/app/manage/ai-configuration/page.tsx
//
// v1.3.5 Build 3 — the master AI provisioning page lives in the platform
// dashboard (apps/dashboard/src/pages/AIProvisioning.tsx); it is the
// single source of truth for provider/model selection per AI caller
// because it projects the platform's declarations directly. THIS page
// in the deployed app's management panel keeps the deployed-side surfaces:
//
//   - The legacy reasoning-model + per-task model cards (Phase 3 / 14)
//     remain in place for backward compatibility.
//   - The new TokenUsageCard surfaces this project's monthly token usage
//     so the developer sees consumption without leaving the deployed
//     app. Display only (limits arrive in v2 per R6).
//
// The deployed app's END-USER settings (a separate surface used by BYOK
// end users to manage THEIR OWN keys) lives outside the management panel —
// manage is the developer's surface, not the end user's.

import { AIConfigurationCard } from '../components/AIConfigurationCard';
import { ModelSelectionCard }  from '../components/ModelSelectionCard';
import { TokenUsageCard }      from '../components/TokenUsageCard';
import type { JSX } from 'react';

export default function AIConfigurationPage(): JSX.Element {
  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <h2 style={{ marginBottom: 16 }}>AI Configuration</h2>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
        Configure how the platform's reasoning step sizes turns in your app +
        per-task-type model selections for the Agent SDK code authoring path.
        These affect every agent invocation in your deployed app — for both
        end users and admins.
      </p>
      <p style={{
        background: '#13131F', border: '1px solid #1E1E2E', borderRadius: 8,
        padding: 12, marginBottom: 24, color: '#8B8B9F', fontSize: 13,
      }}>
        For provider + model selection per AI caller (System AI, per-tool
        overrides, Skill generation, Agentic coding, Quick code tools), use
        the unified <strong>AI provisioning</strong> page in your Cactai
        dashboard. This page keeps the legacy reasoning-model and per-task
        model cards plus a per-tenant token usage view.
      </p>
      <AIConfigurationCard />
      <ModelSelectionCard />
      <TokenUsageCard />
    </div>
  );
}
