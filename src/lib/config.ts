// Reads cactai.config.json — the app's declared shape. The provisioning
// wizard writes `tenancy` (multi | single) and prunes the template to match
// (D-T80); a null tenancy means provisioning has not completed.

import config from '../../cactai.config.json';

export interface CactaiConfig {
  readonly framework_version: string;
  readonly app: { readonly name: string; readonly description: string; readonly url: string };
  readonly tenancy: 'multi' | 'single' | null;
  readonly auth: { readonly providers: readonly string[] };
  readonly personality: { readonly active: string };
  readonly theme: { readonly active: string };
  readonly media: { readonly image_domains: readonly string[] };
}

export function cactaiConfig(): CactaiConfig {
  return config as unknown as CactaiConfig;
}
