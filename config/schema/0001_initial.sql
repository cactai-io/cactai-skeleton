-- config/schema/0001_initial.sql
-- Developer's Supabase schema — applied at provisioning time and managed
-- by the workflow agent thereafter.
-- Run via: supabase db push or the Supabase Management API.
--
-- Tables:
--   app_users                     — user identity (no role column)
--   platform_roles                — dev/collaborator roles above tenancy
--   tenants                       — account/org records
--   tenant_members                — user<>tenant membership with role
--   tenant_invitations            — pending user invitations with role and expiry
--   app_roles                     — capability configuration per role
--   project_state                 — workflow step machine, decisions, signup policy
--   dev_sprints                   — sprint records
--   dev_sprint_goals              — goals within each sprint
--   dev_goal_backlog              — deferred goals and captured tangents
--   audit_log                     — lens-aware action audit trail
--   memory                        — working memory and short-term state
--   knowledge_promotion_proposals — surfaced preferences for confirmation
--   user_facts                    — durable user facts
--   user_preferences              — durable user preferences
--   user_decisions                — recorded user decisions
--   user_artifacts                — user-owned artifact references
--   user_api_keys                 — per-user encrypted provider API keys
--   project_knowledge             — per-project knowledge base (pgvector)
--   artifact_registry             — per-project artifact records
--   artifact_versions             — versioned artifact snapshots
--   knowledge                     — chunked document knowledge (pgvector)
--   sessions                      — agent session state
--   threads                       — thread tree within a session
--   projects                      — project metadata
--   goal_nodes                    — goal graph for a project

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Identity ─────────────────────────────────────────────────────────────────

-- app_users: identity row. Mirrors Supabase Auth's auth.users id. No role.
CREATE TABLE IF NOT EXISTS app_users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_users_self_read   ON app_users FOR SELECT USING (id = auth.uid());
CREATE POLICY app_users_self_update ON app_users FOR UPDATE USING (id = auth.uid());

-- platform_roles: dev and collaborator — roles above tenancy.
-- Only the developer's own accounts (and collaborators they invite) have rows here.
CREATE TABLE IF NOT EXISTS platform_roles (
  user_id    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('dev', 'collaborator')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_roles_dev_read ON platform_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles pr
      WHERE pr.user_id = auth.uid() AND pr.role = 'dev'
    )
  );

-- ── Tenants ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  slug         TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  settings     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_member_read ON tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenants.id
        AND tm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM platform_roles pr WHERE pr.user_id = auth.uid()
    )
  );

-- tenant_members: one user can hold multiple roles on a tenant simultaneously.
-- The developer holds all three roles (super_admin, admin, user) on the default
-- tenant so they can operate the app through any lens via the avatar menu.
CREATE TABLE IF NOT EXISTS tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'user'
              CHECK (role IN ('super_admin', 'admin', 'user')),
  invited_by  UUID REFERENCES app_users(id),
  invited_at  TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tenant_id, role)
);
CREATE INDEX IF NOT EXISTS tenant_members_user_idx   ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS tenant_members_tenant_idx ON tenant_members(tenant_id);
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_members_self        ON tenant_members FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY tenant_members_super_admin ON tenant_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenant_members.tenant_id
        AND tm.role = 'super_admin'
        AND tm.status = 'active'
    )
  );
CREATE POLICY tenant_members_admin_read  ON tenant_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenant_members.tenant_id
        AND tm.role IN ('super_admin', 'admin')
        AND tm.status = 'active'
    )
  );

-- ── Invitations ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES app_users(id),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES app_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tenant_invitations_tenant_idx ON tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_invitations_email_idx  ON tenant_invitations(LOWER(email));
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY invitations_admin ON tenant_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenant_invitations.tenant_id
        AND tm.role IN ('super_admin', 'admin')
        AND tm.status = 'active'
    )
  );

-- ── App roles (capability definitions) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_roles (
  role_name    TEXT PRIMARY KEY,
  capabilities JSONB NOT NULL DEFAULT '[]',
  is_system    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_roles (role_name, capabilities, is_system) VALUES
  ('super_admin', '["manage_users","manage_billing","manage_config","view_reports","manage_content"]', true),
  ('admin',       '["manage_content","view_reports","manage_users"]',                                  true),
  ('user',        '["view_content","submit_input","manage_own_profile"]',                              true)
ON CONFLICT (role_name) DO NOTHING;

-- ── Workflow state ───────────────────────────────────────────────────────────
-- One row per project. Holds the workflow step machine, the running list
-- of decisions, sign-up policy for end users, and sprint/backlog data.
--
-- Reserved keys in decisions JSONB. The TypeScript counterpart is
-- ProjectStateDecisions in src/lib/projectDecisions.server.ts; keep this
-- comment, that interface, and DECISION_KEYS in sync.
--
-- Handoff contract: only signup_mode_v1 is guaranteed present on the first
-- DevShell open (set by the DEFAULT clause below when any writer creates
-- the row). All other keys are populated lazily by Operate, DevShell, or
-- the workflow runtime; consumers must tolerate their absence.
--
--   signup_mode_v1       — one of: 'single_user_shared' | 'single_user_isolated'
--                          | 'multi_user_single_workspace' | 'multi_user_multi_workspace'
--                          Determines who can sign up and how new users
--                          are assigned to tenants/roles. See
--                          src/lib/signup-mode.ts (skeleton) for semantics.
--                          GUARANTEED present on first DevShell open (DEFAULT).
--   default_tenant_id    — UUID of the tenant new users join under the
--                          *_single_workspace and single_user_shared modes
--   invitation_email_v1  — { provider: 'supabase'|'resend'|'none',
--                            email_from?, resend_api_key? }. Written by the
--                          developer's Operate UI (EmailConfigCard) post-
--                          provision; absent on first DevShell open.
--   active_personality_id — id of the active product personality
--   dev_authored_personalities — list of dev-authored personality ids
--   active_workflow_id   — id of the active workflow
--   capability_config_v2 — { appshell: {...}, devshell: {...} } per-scope availability map
--   byok                 — bring-your-own-key config for model providers

CREATE TABLE IF NOT EXISTS project_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      TEXT NOT NULL UNIQUE,
  workflow_step   TEXT NOT NULL DEFAULT 'name_and_intent'
                  CHECK (workflow_step IN (
                    'name_and_intent','audience','personality','theme','layout',
                    'hero_moment','capabilities','data_and_memory','roles_and_access',
                    'preview_live'
                  )),
  decisions       JSONB NOT NULL DEFAULT '{"signup_mode_v1":"multi_user_single_workspace"}',
  roles_config    JSONB NOT NULL DEFAULT '{}',
  is_multi_tenant BOOLEAN NOT NULL DEFAULT FALSE,
  skeleton_pushed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Service role only — no RLS policies. The platform accesses via service key.
ALTER TABLE project_state ENABLE ROW LEVEL SECURITY;

-- ── Sprints and backlog ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dev_sprints (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         TEXT NOT NULL,
  name               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'planning'
                     CHECK (status IN ('planning','active','review','merged','abandoned')),
  definition_of_done TEXT NOT NULL DEFAULT '',
  dev_branch_commit  TEXT,
  main_merge_commit  TEXT,
  vercel_preview_url TEXT,
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dev_sprints_project_idx ON dev_sprints(project_id);
ALTER TABLE dev_sprints ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dev_sprint_goals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id              UUID NOT NULL REFERENCES dev_sprints(id) ON DELETE CASCADE,
  description            TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','in_progress','complete','deferred')),
  deferred_to_backlog_id UUID,
  completed_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dev_sprint_goals_sprint_idx ON dev_sprint_goals(sprint_id);
ALTER TABLE dev_sprint_goals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dev_goal_backlog (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           TEXT NOT NULL,
  description          TEXT NOT NULL,
  source               TEXT NOT NULL DEFAULT 'agent_suggested'
                       CHECK (source IN ('plan_goal','tangent_capture','sprint_deferred','agent_suggested')),
  depends_on_decisions JSONB NOT NULL DEFAULT '[]',
  target_sprint_id     UUID REFERENCES dev_sprints(id),
  source_thread_id     TEXT,
  source_turn_number   INTEGER NOT NULL DEFAULT 0,
  surfaced             BOOLEAN NOT NULL DEFAULT FALSE,
  surfaced_at          TIMESTAMPTZ,
  acknowledged         BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at      TIMESTAMPTZ,
  resolved             BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dev_goal_backlog_project_idx  ON dev_goal_backlog(project_id);
CREATE INDEX IF NOT EXISTS dev_goal_backlog_resolved_idx ON dev_goal_backlog(project_id, resolved);
ALTER TABLE dev_goal_backlog ENABLE ROW LEVEL SECURITY;

-- ── Audit log ────────────────────────────────────────────────────────────────
-- Lens-aware audit trail. Every privileged or state-changing action records
-- the active lens at the time of the action so audit reviewers can distinguish
-- a super_admin's lens-mediated actions from genuine user actions.

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES app_users(id) ON DELETE SET NULL,
  tenant_id   UUID REFERENCES tenants(id)   ON DELETE SET NULL,
  lens        TEXT CHECK (lens IN ('super_admin', 'admin', 'user', 'dev', 'collaborator')),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_user_idx    ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_tenant_idx  ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx  ON audit_log(action, created_at DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_admin ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = audit_log.tenant_id
        AND tm.role IN ('super_admin', 'admin')
        AND tm.status = 'active'
        AND tm.role = current_setting('app.active_lens', true)
    )
  );

-- ── Memory ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id    UUID REFERENCES app_users(id) ON DELETE CASCADE,
  scope      TEXT NOT NULL DEFAULT 'project',
  key        TEXT NOT NULL,
  value      JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, scope, key)
);
CREATE INDEX IF NOT EXISTS memory_project_idx ON memory(project_id, scope);
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_member ON memory FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

-- ── Knowledge promotion ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_promotion_proposals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('preference', 'knowledge')),
  domain     TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  rationale  TEXT NOT NULL,
  trigger    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE knowledge_promotion_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY knowledge_promotion_proposals_member ON knowledge_promotion_proposals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role = current_setting('app.active_lens', true)
    )
  );

-- ── User knowledge ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_facts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  key            TEXT NOT NULL,
  value          TEXT NOT NULL,
  confidence     REAL NOT NULL DEFAULT 0.5,
  embedding      vector(1536),
  last_confirmed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key)
);
CREATE INDEX IF NOT EXISTS user_facts_user_idx      ON user_facts(user_id);
CREATE INDEX IF NOT EXISTS user_facts_embedding_idx ON user_facts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
ALTER TABLE user_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_facts_self ON user_facts FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  domain            TEXT NOT NULL,
  pattern           TEXT NOT NULL,
  confidence        REAL NOT NULL DEFAULT 0.5,
  observation_count INTEGER NOT NULL DEFAULT 1,
  embedding         vector(1536),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, domain, pattern)
);
CREATE INDEX IF NOT EXISTS user_preferences_user_idx ON user_preferences(user_id);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_self ON user_preferences FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_decisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  domain            TEXT NOT NULL,
  decision          TEXT NOT NULL,
  context           TEXT NOT NULL,
  context_embedding vector(1536),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_decisions_user_idx      ON user_decisions(user_id);
CREATE INDEX IF NOT EXISTS user_decisions_embedding_idx ON user_decisions USING ivfflat (context_embedding vector_cosine_ops) WITH (lists = 50);
ALTER TABLE user_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_decisions_self ON user_decisions FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_artifacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT,
  description TEXT,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, artifact_id)
);
CREATE INDEX IF NOT EXISTS user_artifacts_user_idx      ON user_artifacts(user_id);
CREATE INDEX IF NOT EXISTS user_artifacts_embedding_idx ON user_artifacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
ALTER TABLE user_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_artifacts_self ON user_artifacts FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id           UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider_id       TEXT NOT NULL,
  api_key_encrypted BYTEA NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider_id)
);
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_api_keys_self ON user_api_keys FOR ALL USING (user_id = auth.uid());

-- ── Project knowledge ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_knowledge (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'inferred' CHECK (source IN ('inferred', 'user_declared')),
  embedding  vector(1536),
  session_id TEXT,
  node_id    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, key)
);
CREATE INDEX IF NOT EXISTS project_knowledge_project_idx   ON project_knowledge(project_id);
CREATE INDEX IF NOT EXISTS project_knowledge_embedding_idx ON project_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE project_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_knowledge_member ON project_knowledge FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

-- ── Artifacts ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS artifact_registry (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  session_id  TEXT,
  node_id     TEXT,
  thread_id   UUID,
  type        TEXT NOT NULL,
  subtype     TEXT,
  title       TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  version     INTEGER NOT NULL DEFAULT 1,
  parent_id   TEXT,
  part_index  INTEGER,
  shared_with JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS artifact_registry_project_idx ON artifact_registry(project_id);
CREATE INDEX IF NOT EXISTS artifact_registry_session_idx ON artifact_registry(session_id);
CREATE INDEX IF NOT EXISTS artifact_registry_node_idx    ON artifact_registry(node_id);
CREATE INDEX IF NOT EXISTS artifact_registry_parent_idx  ON artifact_registry(parent_id);
CREATE INDEX IF NOT EXISTS artifact_registry_type_idx    ON artifact_registry(project_id, type);
ALTER TABLE artifact_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY artifact_registry_member ON artifact_registry FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

CREATE TABLE IF NOT EXISTS artifact_versions (
  artifact_id TEXT NOT NULL,
  version     INTEGER NOT NULL,
  snapshot    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (artifact_id, version)
);
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY artifact_versions_member ON artifact_versions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM artifact_registry r
    JOIN tenant_members tm ON tm.user_id = auth.uid() AND tm.status = 'active'
    WHERE r.id = artifact_versions.artifact_id
      AND tm.role = current_setting('app.active_lens', true)
  )
);

-- ── Knowledge (vector-search chunked documents) ──────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL,
  user_id     UUID REFERENCES app_users(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  metadata    JSONB,
  indexed_at  TIMESTAMPTZ DEFAULT NOW(),
  chunk_index INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS knowledge_project_idx   ON knowledge(project_id, user_id);
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx ON knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY knowledge_self_or_member ON knowledge FOR ALL USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

-- ── Agent orchestration state ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  goal        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','complete','archived','deleted')),
  isolation   TEXT NOT NULL DEFAULT 'open'
              CHECK (isolation IN ('open','isolated')),
  owner_id    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_id);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_member ON projects FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

CREATE TABLE IF NOT EXISTS goal_nodes (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id    TEXT,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','complete','blocked','failed','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS goal_nodes_project_idx ON goal_nodes(project_id);
ALTER TABLE goal_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY goal_nodes_member ON goal_nodes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL,
  project_id     TEXT NOT NULL,
  objective      TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'pending',
  intent         JSONB,
  plan           JSONB,
  steps          JSONB NOT NULL DEFAULT '[]',
  working_memory JSONB NOT NULL DEFAULT '{"facts":{},"context":{},"scratchpad":[]}',
  config         JSONB NOT NULL DEFAULT '{}',
  goal_node_ids  JSONB NOT NULL DEFAULT '[]',
  root_thread_id UUID,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_project_idx ON sessions(project_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx  ON sessions(status);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_member ON sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

CREATE TABLE IF NOT EXISTS threads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  session_id       TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  anchor           JSONB,
  goal             TEXT,
  plan             JSONB,
  messages         JSONB NOT NULL DEFAULT '[]',
  working_memory   JSONB NOT NULL DEFAULT '{"facts":{},"context":{},"scratchpad":[]}',
  steps            JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','paused','complete','abandoned')),
  title            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS threads_session_idx ON threads(session_id);
CREATE INDEX IF NOT EXISTS threads_parent_idx  ON threads(parent_thread_id);
CREATE INDEX IF NOT EXISTS threads_status_idx  ON threads(status);
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY threads_member ON threads FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = current_setting('app.active_lens', true)
  )
);

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_root_thread_id_fkey;
ALTER TABLE sessions ADD CONSTRAINT sessions_root_thread_id_fkey
  FOREIGN KEY (root_thread_id) REFERENCES threads(id) ON DELETE SET NULL;

-- ── Operator panel views ─────────────────────────────────────────────────────

CREATE OR REPLACE VIEW tenant_summary AS
  SELECT
    t.id,
    t.display_name,
    t.slug,
    t.status,
    t.created_at,
    COUNT(tm.id) FILTER (WHERE tm.status = 'active') AS member_count,
    COUNT(tm.id) FILTER (WHERE tm.role = 'super_admin' AND tm.status = 'active') AS owner_count
  FROM tenants t
  LEFT JOIN tenant_members tm ON tm.tenant_id = t.id
  GROUP BY t.id;
