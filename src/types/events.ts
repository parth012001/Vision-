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

export interface SessionEvent {
  event: EventName;
  sessionId: string;
  traceId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

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

export interface SessionReconnectingData {
  attemptNumber: number;
  reason: "goaway" | "close";
}

export interface SessionReconnectedData {
  attemptNumber: number;
  downtimeMs: number;
}

export interface SessionErrorData {
  errorMessage: string;
  sessionAgeMs: number;
}
