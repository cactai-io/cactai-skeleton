// config/design/pages/onboarding.ts
// Onboarding page design spec — populated by the agent during workflow Stage 8.
// Only relevant if the app has a user onboarding flow.

export interface OnboardingPageSpec {
  steps:          string[];    // ordered onboarding step names
  style:          string;      // 'wizard' | 'single-page' | 'inline'
  visibleToRoles: string[];
}

export const onboardingSpec: OnboardingPageSpec = {
  steps:          [],
  style:          '',
  visibleToRoles: ['user'],
};
