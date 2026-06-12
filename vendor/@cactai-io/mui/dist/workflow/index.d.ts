import type { SurfaceFormField, GoalBacklogEntry, SprintRecord, WorkflowDecisionRecord } from '@cactai-io/types';
export interface PlanNote {
    id: string;
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
}
export interface WorkflowSurfaceProps {
    activeForm?: {
        stage: string;
        fields: SurfaceFormField[];
    };
    decisions: Record<string, WorkflowDecisionRecord>;
    backlog: GoalBacklogEntry[];
    sprints: SprintRecord[];
    onFormSubmit: (choices: Record<string, unknown>) => void;
    /** Wizard back navigation — when wired, the DecisionInput shows a Back
     *  button on the left of the action row. Host calls the navigate-back
     *  endpoint to step the wizard one step earlier in the walk order. */
    onBack?: () => void;
    onRevisit: (decisionKey: string) => void;
    onResolveBacklog: (entryId: string) => void;
    onCreateBacklog?: (description: string) => Promise<void> | void;
    onUpdateBacklog?: (id: string, description: string) => Promise<void> | void;
    onDeleteBacklog?: (id: string) => Promise<void> | void;
    /** Inject a backlog entry's description into the chat as the developer's
     *  next turn. Minimal-viable v1 until backlog → sprint workflow is built. */
    onDiscussBacklog?: (description: string) => void;
    onRenameSprint?: (id: string, name: string) => Promise<void> | void;
    onDeleteSprint?: (id: string) => Promise<void> | void;
    /** Project notes (Plan view) — a collection of independent named notes with
     *  full CRUD, backed by /api/workflow/notes (_notes.items). When the create
     *  handler is omitted the Notes tree is hidden. */
    notes?: PlanNote[];
    onCreateNote?: (draft: {
        title: string;
        body: string;
    }) => Promise<PlanNote | null> | void;
    onUpdateNote?: (id: string, draft: {
        title: string;
        body: string;
    }) => Promise<void> | void;
    onDeleteNote?: (id: string) => Promise<void> | void;
}
export declare function WorkflowSurface({ activeForm, decisions, backlog, sprints, onFormSubmit, onBack, onRevisit, onResolveBacklog, onCreateBacklog, onUpdateBacklog, onDeleteBacklog, onDiscussBacklog, onRenameSprint, onDeleteSprint, notes, onCreateNote, onUpdateNote, onDeleteNote, }: WorkflowSurfaceProps): import("react/jsx-runtime").JSX.Element;
interface DecisionLogProps {
    decisions: Record<string, WorkflowDecisionRecord>;
    onRevisit: (key: string) => void;
}
declare function DecisionLog({ decisions, onRevisit }: DecisionLogProps): import("react/jsx-runtime").JSX.Element;
interface DecisionInputProps {
    stage: string;
    fields: SurfaceFormField[];
    onSubmit: (choices: Record<string, unknown>) => void;
    /** Back-button handler. When set, a Back button appears on the left of
     *  the action row, mirroring the Confirm choices button on the right. */
    onBack?: () => void;
}
declare function DecisionInput({ stage, fields, onSubmit, onBack }: DecisionInputProps): import("react/jsx-runtime").JSX.Element;
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
    /** Inject the entry's description into the chat as the developer's next
     *  turn. The minimal-viable workflow path until backlog-driven sprints are
     *  built — clicking an entry kicks off a chat conversation about it. */
    onDiscussInChat?: (description: string) => void;
}
declare function GoalBacklog({ entries, onResolve, onCreate, onUpdate, onDelete, onDiscussInChat }: GoalBacklogProps): import("react/jsx-runtime").JSX.Element;
interface SprintOverviewProps {
    sprints: SprintRecord[];
    activeSprint?: SprintRecord;
    onRename?: (id: string, name: string) => Promise<void> | void;
    onDelete?: (id: string) => Promise<void> | void;
}
declare function SprintOverview({ sprints, activeSprint, onRename, onDelete }: SprintOverviewProps): import("react/jsx-runtime").JSX.Element;
export { DecisionLog, DecisionInput, GoalBacklog, SprintOverview, ButtonSelect, DragRank, ColorPicker, PersonalityCards, };
