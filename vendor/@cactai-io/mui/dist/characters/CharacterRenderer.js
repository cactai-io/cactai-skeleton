import { jsx as _jsx } from "react/jsx-runtime";
// Map MorphState → CharacterMood
export function morphToMood(state) {
    switch (state) {
        case 'thinking': return 'thinking';
        case 'executing': return 'thinking';
        case 'delivering': return 'responding';
        case 'awaiting_input': return 'waiting';
        case 'complete': return 'idle';
        case 'error': return 'error';
        default: return 'idle';
    }
}
// Map mood → animation class name
export function moodToAnimationClass(mood, character) {
    switch (mood) {
        case 'thinking': return character.thinking_animation;
        case 'waiting': return character.waiting_animation;
        case 'responding': return character.responding_animation;
        default: return character.idle_animation;
    }
}
// Import map — character SVG id → React component
// Add entries here as new characters are created
import { OwlCharacter } from './OwlCharacter.js';
import { RobotCharacter } from './RobotCharacter.js';
import { PrairieDogCharacter } from './PrairieDogCharacter.js';
// Personality → character routing (per Phase 7B):
//   'sam'   → robot
//   'milo'  → prairie-dog
//   'ember' → owl
const CHARACTER_MAP = {
    owl: OwlCharacter,
    robot: RobotCharacter,
    'prairie-dog': PrairieDogCharacter,
};
export function CharacterRenderer({ character, mood, size = 36, forceClass, className = '', }) {
    const Component = CHARACTER_MAP[character.svg_id];
    if (!Component) {
        // Fallback: gradient pulse dot (used when character SVG not yet registered)
        return (_jsx("span", { className: `ds-char-fallback ${className}`, style: { width: size, height: size }, "aria-hidden": "true" }));
    }
    const animClass = forceClass ?? moodToAnimationClass(mood, character);
    return (_jsx(Component, { className: `ds-character ${animClass} ${className}`, size: size }));
}
//# sourceMappingURL=CharacterRenderer.js.map