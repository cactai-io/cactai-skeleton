// config/design/pages/dashboard.ts
// Dashboard page design spec — populated by the agent during workflow Stage 8.
// Describes the layout and component choices for the main app dashboard.
// Agent writes here after the developer confirms page structure in Stage 8.

export interface DashboardPageSpec {
  // Layout: sidebar | topbar | minimal
  navigationStyle: string;
  // Grid columns for the main content area
  contentColumns:  number;
  // Key sections shown on the dashboard
  sections:        string[];
  // Primary action for this page
  primaryAction:   string;
  // Whether this page requires auth (always true for dashboard)
  requiresAuth:    boolean;
  // Which roles can see this page
  visibleToRoles:  string[];
}

// Stub — agent populates during Stage 8
export const dashboardSpec: DashboardPageSpec = {
  navigationStyle: '',
  contentColumns:  2,
  sections:        [],
  primaryAction:   '',
  requiresAuth:    true,
  visibleToRoles:  ['dev', 'super_admin', 'admin', 'user'],
};
