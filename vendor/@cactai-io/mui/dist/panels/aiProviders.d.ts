import { type ProviderCategory } from '@cactai-io/types';
export declare const AI_BUDGET_CATEGORIES: ProviderCategory[];
export declare const CATEGORY_LABEL: Partial<Record<ProviderCategory, string>>;
export declare const BUDGET_UNIT: Partial<Record<ProviderCategory, string>>;
export interface AIProviderGroup {
    category: ProviderCategory;
    providers: Array<{
        id: string;
        name: string;
    }>;
}
/** The metered AI providers grouped by category, in AI_BUDGET_CATEGORIES order. */
export declare function groupAIProviders(): AIProviderGroup[];
