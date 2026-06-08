import type { MUIShell } from '../shell/MUIShell.js';
import type { MorphState } from '@cactai-io/types';
import type { PersonalityCharacter } from '@cactai-io/types';
import type { TurnClassification } from '@cactai-io/types';
export type DevView = 'build' | 'plan' | 'test_drive' | 'history';
export interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: string;
    classification?: TurnClassification;
    backlog_added?: boolean;
    streaming?: boolean;
}
export interface DevChatPanelProps {
    shell: MUIShell;
    messages: ChatMessage[];
    agentState: MorphState;
    character?: PersonalityCharacter;
    agentDisplayName: string;
    activeView: DevView;
    onCollapse: () => void;
    inspectorLabel?: string;
    onClearInspector?: () => void;
    streamingContent?: string;
    chatError?: string | null;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}
export declare function DevChatPanel({ shell, messages, agentState, character, agentDisplayName, activeView, onCollapse, inspectorLabel, onClearInspector, streamingContent, chatError, disabled, className, style, }: DevChatPanelProps): import("react/jsx-runtime").JSX.Element;
