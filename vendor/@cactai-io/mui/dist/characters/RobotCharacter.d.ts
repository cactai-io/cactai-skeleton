export interface RobotCharacterProps {
    className: string;
    size: number;
}
export declare function RobotCharacter({ className, size }: RobotCharacterProps): import("react/jsx-runtime").JSX.Element;
export declare const ROBOT_CHARACTER: {
    readonly svg_id: "robot";
    readonly idle_animation: "ds-anim-robot-idle";
    readonly thinking_animation: "ds-anim-robot-think";
    readonly waiting_animation: "ds-anim-robot-wait";
    readonly responding_animation: "ds-anim-robot-respond";
};
