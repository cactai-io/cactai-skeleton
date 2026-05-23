// src/app/api/settings/personality/test/route.ts
// v1.2 Thread 07 — sample-turn endpoint used by the personality editor's
// "Test" button. Proxies the test prompt to the platform, which runs one
// model call in the edited personality's voice and returns the result.
// The test is stateless: it never persists the edited definition and
// never affects the project's active personality.
//
// Protected: dev only.

import { endpoints } from '@/lib/endpoints';
import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';
import type {
  PersonalityTestRequest,
  PersonalityTestResponse,
} from '@cactai-io/types';

export async function POST(req: NextRequest) {
  try {
    const user = await requireDevRole();
    if (user.platform_role !== 'dev') {
      return NextResponse.json({ error: 'dev_only' }, { status: 403 });
    }

    const body = (await req.json()) as PersonalityTestRequest;
    if (!body?.definition?.identity?.name) {
      return NextResponse.json({ error: 'invalid_definition' }, { status: 400 });
    }

    const apiKey  = endpoints.cactaiApiKey;
    const baseUrl = endpoints.cactaiBase;
    if (!apiKey) {
      // Without a platform key we can't run a real turn. Return a
      // canned echo so the editor still has something to show — the
      // developer can still see how their tone string formats. The UI
      // surfaces a small "offline preview" note next to the result.
      const sample = canned(body);
      const out: PersonalityTestResponse = { sample_text: sample };
      return NextResponse.json(out);
    }

    const res = await fetch(`${baseUrl}/v1/personalities/test`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Fall back to canned sample so the editor stays usable.
      const sample = canned(body);
      const out: PersonalityTestResponse = { sample_text: sample };
      return NextResponse.json(out);
    }

    const data = (await res.json()) as PersonalityTestResponse;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'personality_test_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// Offline fallback. Renders the personality's `tone` and the first
// quality as a short sample sentence — enough to show whether the
// edited fields wire through.
function canned(body: PersonalityTestRequest): string {
  const name = body.definition.identity.name;
  const tone = body.definition.behavioral.tone;
  const q    = body.definition.behavioral.qualities[0] ?? '';
  return `[${name}] ${tone.charAt(0).toUpperCase()}${tone.slice(1)}.${q ? ` ${q}` : ''}`;
}
