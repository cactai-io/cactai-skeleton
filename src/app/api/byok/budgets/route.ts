// src/app/api/byok/budgets/route.ts
// End-user-side BYOK budget surface. Each end user (any signed-in app
// user, not just dev) can cap their own monthly spend on their own
// BYOK keys per provider. The developer doesn't set these — it's not
// their key or their money. The developer's BYOK choice in App
// Configuration enables this feature; this endpoint is the data path.
//
// Storage: project_state.decisions._user_budgets[user_id][provider_id]
//   = { limit_units, alert_at_units?, last_reset_at }
// Units are provider-native (tokens/credits/dollars) per
// keys-budgets-team-policy memo.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase.server';
import { createServiceSupabaseClient } from '@/lib/supabase.server';
import { endpoints } from '@/lib/endpoints';

interface BudgetEntry {
  limit_units:     number;
  alert_at_units?: number;
  last_reset_at?:  string;
}

type BudgetMap = Record<string, Record<string, BudgetEntry>>;

async function requireAuthedUser(): Promise<string | null> {
  const sb = await createServerSupabaseClient();
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

async function loadBudgets(): Promise<BudgetMap> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('project_state')
    .select('decisions')
    .eq('project_id', endpoints.projectId)
    .maybeSingle();
  const decisions = (data?.decisions ?? {}) as Record<string, unknown>;
  return (decisions['_user_budgets'] ?? {}) as BudgetMap;
}

async function saveBudgets(budgets: BudgetMap): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { data: state } = await supabase
    .from('project_state')
    .select('decisions')
    .eq('project_id', endpoints.projectId)
    .maybeSingle();
  const decisions = (state?.decisions ?? {}) as Record<string, unknown>;
  const next = { ...decisions, _user_budgets: budgets };
  await supabase
    .from('project_state')
    .upsert({ project_id: endpoints.projectId, decisions: next });
}

export async function GET() {
  const userId = await requireAuthedUser();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const all = await loadBudgets();
  return NextResponse.json({ budgets: all[userId] ?? {} });
}

export async function PUT(req: NextRequest) {
  const userId = await requireAuthedUser();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    provider_id?:    string;
    limit_units?:    number;
    alert_at_units?: number;
  };
  if (!body.provider_id || typeof body.limit_units !== 'number' || body.limit_units < 0) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const all = await loadBudgets();
  const mine = all[userId] ?? {};
  mine[body.provider_id] = {
    limit_units:    body.limit_units,
    alert_at_units: body.alert_at_units,
    last_reset_at:  new Date().toISOString(),
  };
  all[userId] = mine;
  await saveBudgets(all);
  return NextResponse.json({ ok: true, budgets: mine });
}

export async function DELETE(req: NextRequest) {
  const userId = await requireAuthedUser();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { provider_id?: string };
  if (!body.provider_id) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const all = await loadBudgets();
  if (all[userId]) {
    delete all[userId][body.provider_id];
    await saveBudgets(all);
  }
  return NextResponse.json({ ok: true });
}
