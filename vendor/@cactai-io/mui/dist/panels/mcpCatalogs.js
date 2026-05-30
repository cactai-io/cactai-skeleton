// packages/mui/src/panels/mcpCatalogs.ts
//
// Context-appropriate "popular integration" catalogs for each MCP
// surface. These are illustrative cards for the UI sprint — clicking
// Connect pre-fills the add form with the integration's known MCP
// server URL and persists an INERT row. The endpoint URLs are
// best-effort known public MCP endpoints; exact correctness doesn't
// matter this sprint (nothing connects), but using real ones keeps the
// UX authentic and avoids rework when the functional layer lands.
//
// Per memory: mcp-integration-architecture.md — four surfaces, two
// audiences (Platform MCP, DevShell MCP, AppShell MCP shared, AppShell
// MCP personal). The catalog content differs per surface so the
// options logically match what the viewer would want to connect THERE.
// Platform MCP — builder-owner's account-wide tooling (platform dashboard).
// Tools they run their business on — financials, planning, analytics,
// ops, secrets — applied across every project they own.
export const PLATFORM_CATALOG = [
    { id: 'quickbooks', label: 'QuickBooks', glyph: '📊', description: 'Sync revenue + billing data to your accounting.', endpoint_url: 'https://mcp.quickbooks.com/sse', auth_type: 'oauth' },
    { id: 'xero', label: 'Xero', glyph: '📒', description: 'Push financial data to your books.', endpoint_url: 'https://mcp.xero.com/sse', auth_type: 'oauth' },
    { id: 'notion', label: 'Notion', glyph: '📝', description: 'Export usage + planning data into Notion.', endpoint_url: 'https://mcp.notion.com/sse', auth_type: 'oauth' },
    { id: 'linear', label: 'Linear', glyph: '📐', description: 'Roadmap + project status across your projects.', endpoint_url: 'https://mcp.linear.app/sse', auth_type: 'oauth' },
    { id: 'gsheets', label: 'Google Sheets', glyph: '📈', description: 'Export metering + revenue to a spreadsheet.', endpoint_url: 'https://mcp.google.com/sheets/sse', auth_type: 'oauth' },
    { id: 'slack', label: 'Slack', glyph: '💬', description: 'Account-wide alerts + ops notifications.', endpoint_url: 'https://mcp.slack.com/sse', auth_type: 'oauth' },
    { id: '1password', label: '1Password', glyph: '🔐', description: 'Import provider keys from your vault.', endpoint_url: 'https://mcp.1password.com/sse', auth_type: 'bearer' },
];
// DevShell MCP — builder-owner, single-project level. Tools for building
// one app — repo, issues, the project DB, observability, design, docs.
export const DEVSHELL_CATALOG = [
    { id: 'github', label: 'GitHub', glyph: '🐙', description: "This project's repo, PRs, and issues.", endpoint_url: 'https://mcp.github.com/sse', auth_type: 'oauth' },
    { id: 'linear', label: 'Linear', glyph: '📐', description: "This project's issues + sprint board.", endpoint_url: 'https://mcp.linear.app/sse', auth_type: 'oauth' },
    { id: 'jira', label: 'Jira', glyph: '🗂️', description: "Track work in Jira while you build.", endpoint_url: 'https://mcp.atlassian.com/sse', auth_type: 'oauth' },
    { id: 'postgres', label: 'Postgres', glyph: '🐘', description: "Query the project's database directly.", endpoint_url: 'https://mcp.postgres.example/sse', auth_type: 'bearer' },
    { id: 'sentry', label: 'Sentry', glyph: '🛡️', description: 'Pull in errors + traces as you debug.', endpoint_url: 'https://mcp.sentry.io/sse', auth_type: 'oauth' },
    { id: 'figma', label: 'Figma', glyph: '🎨', description: 'Reference designs while building UI.', endpoint_url: 'https://mcp.figma.com/sse', auth_type: 'oauth' },
    { id: 'confluence', label: 'Confluence', glyph: '📚', description: 'Bring project specs + docs into context.', endpoint_url: 'https://mcp.atlassian.com/confluence/sse', auth_type: 'oauth' },
];
// AppShell MCP (shared) — builder-owner configuring capabilities for
// ALL end users. Systems the deployed app should integrate with on
// every user's behalf.
export const APP_DEFAULT_CATALOG = [
    { id: 'knowledge', label: 'Knowledge base', glyph: '📖', description: 'Let the app answer from your docs.', endpoint_url: 'https://mcp.example.com/kb/sse', auth_type: 'bearer' },
    { id: 'crm', label: 'CRM', glyph: '🤝', description: 'Read + update customer records.', endpoint_url: 'https://mcp.example.com/crm/sse', auth_type: 'bearer' },
    { id: 'helpdesk', label: 'Helpdesk', glyph: '🎫', description: 'Create + look up support tickets.', endpoint_url: 'https://mcp.example.com/helpdesk/sse', auth_type: 'bearer' },
    { id: 'shared-db', label: 'Shared database', glyph: '🗄️', description: 'Give the app read access to a data store.', endpoint_url: 'https://mcp.example.com/db/sse', auth_type: 'bearer' },
    { id: 'slack', label: 'Slack', glyph: '💬', description: 'Post notifications to your workspace.', endpoint_url: 'https://mcp.slack.com/sse', auth_type: 'oauth' },
];
// AppShell MCP (personal) — each end user, personal level. Their own
// personal accounts, used only in their own sessions.
export const END_USER_CATALOG = [
    { id: 'notion', label: 'Notion', glyph: '📝', description: 'Let the assistant use your Notion.', endpoint_url: 'https://mcp.notion.com/sse', auth_type: 'oauth' },
    { id: 'gdrive', label: 'Google Drive', glyph: '📁', description: 'Access your Drive files.', endpoint_url: 'https://mcp.google.com/drive/sse', auth_type: 'oauth' },
    { id: 'gmail', label: 'Gmail', glyph: '✉️', description: 'Read + draft email on your behalf.', endpoint_url: 'https://mcp.google.com/gmail/sse', auth_type: 'oauth' },
    { id: 'gcal', label: 'Google Calendar', glyph: '📅', description: 'Check + create calendar events.', endpoint_url: 'https://mcp.google.com/calendar/sse', auth_type: 'oauth' },
    { id: 'slack', label: 'Slack', glyph: '💬', description: 'Send + read your Slack messages.', endpoint_url: 'https://mcp.slack.com/sse', auth_type: 'oauth' },
    { id: 'github', label: 'GitHub', glyph: '🐙', description: 'Work with your repos + issues.', endpoint_url: 'https://mcp.github.com/sse', auth_type: 'oauth' },
];
export const MCP_CATALOGS = {
    platform: PLATFORM_CATALOG,
    devshell: DEVSHELL_CATALOG,
    app_default: APP_DEFAULT_CATALOG,
    end_user: END_USER_CATALOG,
};
// Per-surface explainer copy. Plain paragraphs rendered above the
// catalog. Tells the viewer what MCP is for HERE.
export const MCP_EXPLAINERS = {
    platform: [
        'Connect the tools you run your business on. MCP lets Cactai exchange data with your accounting, planning, analytics, and ops systems — across every project in your account.',
        'For example: export your usage and revenue into your accounting tool, or pull roadmap items from your planning app.',
    ],
    devshell: [
        'Connect the tools for building this project. The assistant helping you build can pull context from your repo, issue tracker, database, designs, and docs.',
        'These connections are scoped to this project only.',
    ],
    app_default: [
        'Connect tools your deployed app should use for every end user. Wire in a knowledge base, CRM, or ticketing system once and every user of your app benefits automatically.',
        'End users can also connect their own personal tools — that’s managed separately, by each user.',
    ],
    end_user: [
        'Connect your own tools so the assistant can work with the accounts you already use — your Notion, Drive, calendar, and more.',
        'These connections are private to you and used only in your own sessions.',
    ],
};
//# sourceMappingURL=mcpCatalogs.js.map