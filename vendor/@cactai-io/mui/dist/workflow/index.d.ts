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
    onCreateBacklog?: (description: string) => Promise<void> | void;
    onUpdateBacklog?: (id: string, description: string) => Promise<void> | void;
    onDeleteBacklog?: (id: string) => Promise<void> | void;
    onRenameSprint?: (id: string, name: string) => Promise<void> | void;
    onDeleteSprint?: (id: string) => Promise<void> | void;
    /** Free-form project-level markdown notes (Plan view). Backed by
     *  /api/workflow/notes (_notes.project). When the save handler is
     *  omitted the Notes panel is hidden. */
    projectNotes?: string;
    onSaveProjectNotes?: (markdown: string) => Promise<void> | void;
    /** Per-decision note threads, keyed by decision key. Backed by
     *  /api/workflow/notes (_notes.decisions[key]). When the add handler
     *  is omitted, the per-decision note affordance is hidden. */
    decisionNotes?: Record<string, Array<{
        at: string;
        content: string;
    }>>;
    onAddDecisionNote?: (decisionKey: string, content: string) => Promise<void> | void;
}
export declare function WorkflowSurface({ activeForm, decisions, backlog, sprints, onFormSubmit, onRevisit, onResolveBacklog, onCreateBacklog, onUpdateBacklog, onDeleteBacklog, onRenameSprint, onDeleteSprint, projectNotes, onSaveProjectNotes, decisionNotes, onAddDecisionNote, }: WorkflowSurfaceProps): import("react/jsx-runtime").JSX.Element;
interface DecisionLogProps {
    decisions: Record<string, WorkflowDecisionRecord>;
    onRevisit: (key: string) => void;
    decisionNotes?: Record<string, Array<{
        at: string;
        content: string;
    }>>;
    onAddDecisionNote?: (decisionKey: string, content: string) => Promise<void> | void;
}
declare function DecisionLog({ decisions, onRevisit, decisionNotes, onAddDecisionNote }: DecisionLogProps): import("react/jsx-runtime").JSX.Element;
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
    /** Add a new backlog entry. When omitted the "+ Add" button is hidden. */
    onCreate?: (description: string) => Promise<void> | void;
    /** Patch an existing entry's description. */
    onUpdate?: (id: string, description: string) => Promise<void> | void;
    /** Hard-delete an entry (vs onResolve which keeps the row resolved=true). */
    onDelete?: (id: string) => Promise<void> | void;
}
declare function GoalBacklog({ entries, onResolve, onCreate, onUpdate, onDelete }: GoalBacklogProps): import("react/jsx-runtime").JSX.Element;
interface SprintOverviewProps {
    sprints: SprintRecord[];
    activeSprint?: SprintRecord;
    onRename?: (id: string, name: string) => Promise<void> | void;
    onDelete?: (id: string) => Promise<void> | void;
}
declare function SprintOverview({ sprints, activeSprint, onRename, onDelete }: SprintOverviewProps): import("react/jsx-runtime").JSX.Element;
export { DecisionLog, DecisionInput, GoalBacklog, SprintOverview, ButtonSelect, DragRank, ColorPicker, PersonalityCards, };
