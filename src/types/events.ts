export type EventName =
  // Session lifecycle (Phase 1)
  | "session.started"
  | "session.connected"
  | "session.disconnected"
  | "session.reconnecting"
  | "session.reconnected"
  | "session.error"
  // AI interaction (Phase 3)
  | "ai.turn_complete"
  | "ai.interrupted"
  | "ai.silence_detected"
  | "ai.nudge_sent"
  | "ai.nudge_result"
  // Workflow/state machine (Phase 3)
  | "workflow.started"
  | "workflow.step_advanced"
  | "workflow.step_rejected"
  | "workflow.completed"
  | "workflow.abandoned"
  // Connection health (Phase 3)
  | "connection.goaway_received"
  | "connection.websocket_error";

export type DisconnectReason = "user" | "error" | "goaway" | "watchdog" | "close";

export interface SessionStartedData {
  userAgent: string;
  deviceType: "mobile" | "tablet" | "desktop";
}

export interface SessionConnectedData {
  connectionDurationMs: number;
  isReconnect: boolean;
}

export interface SessionDisconnectedData {
  reason: DisconnectReason;
  sessionDurationMs: number;
}

export type ReconnectReason = Exclude<DisconnectReason, "user">;

export interface SessionReconnectingData {
  attemptNumber: number;
  reason: ReconnectReason;
}

export interface SessionReconnectedData {
  attemptNumber: number;
  downtimeMs: number;
}

export interface SessionErrorData {
  errorMessage: string;
  sessionAgeMs: number;
}

// AI interaction events
export interface AiTurnCompleteData {
  transcriptText: string;
  turnDurationMs: number;
  turnIndex: number;
}

export interface AiInterruptedData {
  modelOutputDurationMs: number;
}

export interface AiSilenceDetectedData {
  silenceDurationMs: number;
}

export interface AiNudgeSentData {
  silenceDurationMs: number;
}

export interface AiNudgeResultData {
  modelResponded: boolean;
  responseDelayMs: number;
}

// Workflow events
export interface WorkflowStartedData {
  workflowId: string;
}

export interface WorkflowStepAdvancedData {
  stepId: string;
  timeOnPreviousStepMs: number;
}

export interface WorkflowStepRejectedData {
  attemptedStepId: string;
  missingPrerequisites: string[];
}

export interface WorkflowCompletedData {
  totalSteps: number;
  totalDurationMs: number;
  stepsRejectedCount: number;
}

export interface WorkflowAbandonedData {
  lastCompletedStep: string | null;
  totalSteps: number;
  reason: DisconnectReason;
}

// Connection events
export interface ConnectionGoawayReceivedData {
  timeLeftMs: number;
}

export interface ConnectionWebsocketErrorData {
  errorMessage: string;
}

// Discriminated event data map — enforces correct payload per event name
export interface EventDataMap {
  "session.started": SessionStartedData;
  "session.connected": SessionConnectedData;
  "session.disconnected": SessionDisconnectedData;
  "session.reconnecting": SessionReconnectingData;
  "session.reconnected": SessionReconnectedData;
  "session.error": SessionErrorData;
  "ai.turn_complete": AiTurnCompleteData;
  "ai.interrupted": AiInterruptedData;
  "ai.silence_detected": AiSilenceDetectedData;
  "ai.nudge_sent": AiNudgeSentData;
  "ai.nudge_result": AiNudgeResultData;
  "workflow.started": WorkflowStartedData;
  "workflow.step_advanced": WorkflowStepAdvancedData;
  "workflow.step_rejected": WorkflowStepRejectedData;
  "workflow.completed": WorkflowCompletedData;
  "workflow.abandoned": WorkflowAbandonedData;
  "connection.goaway_received": ConnectionGoawayReceivedData;
  "connection.websocket_error": ConnectionWebsocketErrorData;
}

export interface SessionEvent<E extends EventName = EventName> {
  event: E;
  sessionId: string;
  traceId: string;
  timestamp: number;
  data: EventDataMap[E];
}
