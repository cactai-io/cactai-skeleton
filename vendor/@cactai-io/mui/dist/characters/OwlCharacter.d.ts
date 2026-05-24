export interface OwlCharacterProps {
    className: string;
    size: number;
}
export declare function OwlCharacter({ className, size }: OwlCharacterProps): import("react/jsx-runtime").JSX.Element;
export declare const OWL_CHARACTER: {
    readonly svg_id: "owl";
    readonly idle_animation: "ds-anim-owl-idle";
    readonly thinking_animation: "ds-anim-owl-think";
    readonly waiting_animation: "ds-anim-owl-wait";
    readonly responding_animation: "ds-anim-owl-respond";
};
