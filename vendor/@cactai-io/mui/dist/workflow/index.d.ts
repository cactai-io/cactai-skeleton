import type { SurfaceFormField, GoalBacklogEntry, SprintRecord, WorkflowDecisionRecord } from '@cactai-io/types';
export interface WorkflowSurfaceProps {
    activeForm?: {
        stage: string;
        fields: SurfaceFormField[];
    };
    decisions: Record<string, WorkflowDecisionRecord>;
    backlog: GoalBacklogEntry[];
    sprints: SprintRecord[];
    onFormSubmit: (choices: Record<string, unknown>) => void;
    onRevisit: (decisionKey: string) => void;
    onResolveBacklog: (entryId: string) => void;
}
export declare function WorkflowSurface({ activeForm, decisions, backlog, sprints, onFormSubmit, onRevisit, onResolveBacklog, }: WorkflowSurfaceProps): import("react/jsx-runtime").JSX.Element;
interface DecisionLogProps {
    decisions: Record<string, WorkflowDecisionRecord>;
    onRevisit: (key: string) => void;
}
declare function DecisionLog({ decisions, onRevisit }: DecisionLogProps): import("react/jsx-runtime").JSX.Element;
interface DecisionInputProps {
    stage: string;
    fields: SurfaceFormField[];
    onSubmit: (choices: Record<string, unknown>) => void;
}
declare function DecisionInput({ stage, fields, onSubmit }: DecisionInputProps): import("react/jsx-runtime").JSX.Element;
interface ButtonSelectProps {
    options: string[];
    value: string | string[] | undefined;
    recommended?: string;
    rationale?: string;
    onChange: (v: string | string[]) => void;
    multi: boolean;
}
declare function ButtonSelect({ options, value, recommended, rationale, onChange, multi }: ButtonSelectProps): import("react/jsx-runtime").JSX.Element;
declare function DragRank({ options, value, onChange }: {
    options: string[];
    value?: string[];
    onChange: (v: string[]) => void;
}): import("react/jsx-runtime").JSX.Element;
declare function ColorPicker({ value, onChange }: {
    value?: string;
    onChange: (v: string) => void;
}): import("react/jsx-runtime").JSX.Element;
declare function PersonalityCards({ options, value, recommended, onChange }: {
    options: string[];
    value?: string;
    recommended?: string;
    onChange: (v: string) => void;
}): import("react/jsx-runtime").JSX.Element;
interface GoalBacklogProps {
    entries: GoalBacklogEntry[];
    onResolve: (id: string) => void;
}
declare function GoalBacklog({ entries, onResolve }: GoalBacklogProps): import("react/jsx-runtime").JSX.Element;
interface SprintOverviewProps {
    sprints: SprintRecord[];
    activeSprint?: SprintRecord;
}
declare function SprintOverview({ sprints, activeSprint }: SprintOverviewProps): import("react/jsx-runtime").JSX.Element;
export { DecisionLog, DecisionInput, GoalBacklog, SprintOverview, ButtonSelect, DragRank, ColorPicker, PersonalityCards, };
