// config/design/pages/settings.ts
// Settings page design spec — populated by the agent during workflow Stage 8.

export interface SettingsPageSpec {
  sections:       string[];    // e.g. ['profile', 'notifications', 'billing']
  visibleToRoles: string[];
}

export const settingsSpec: SettingsPageSpec = {
  sections:       [],
  visibleToRoles: ['super_admin', 'admin', 'user'],
};
