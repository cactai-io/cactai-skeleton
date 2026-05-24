import type { MorphState } from '@cactai-io/types';
import type { PersonalityCharacter } from '@cactai-io/types';
export type CharacterMood = 'idle' | 'thinking' | 'waiting' | 'responding' | 'success' | 'error';
export declare function morphToMood(state: MorphState): CharacterMood;
export declare function moodToAnimationClass(mood: CharacterMood, character: PersonalityCharacter): string;
export interface CharacterRendererProps {
    character: PersonalityCharacter;
    mood: CharacterMood;
    size?: number;
    forceClass?: string;
    className?: string;
}
export declare function CharacterRenderer({ character, mood, size, forceClass, className, }: CharacterRendererProps): import("react/jsx-runtime").JSX.Element;
