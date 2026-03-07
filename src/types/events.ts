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

export interface SessionReconnectingData {
  attemptNumber: number;
  reason: "goaway" | "close" | "error" | "watchdog";
}

export interface SessionReconnectedData {
  attemptNumber: number;
  downtimeMs: number;
}

export interface SessionErrorData {
  errorMessage: string;
  sessionAgeMs: number;
}

// Discriminated event data map — enforces correct payload per event name
export interface EventDataMap {
  "session.started": SessionStartedData;
  "session.connected": SessionConnectedData;
  "session.disconnected": SessionDisconnectedData;
  "session.reconnecting": SessionReconnectingData;
  "session.reconnected": SessionReconnectedData;
  "session.error": SessionErrorData;
  // Phase 3 events use generic payloads until wired
  "ai.turn_complete": Record<string, unknown>;
  "ai.interrupted": Record<string, unknown>;
  "ai.silence_detected": Record<string, unknown>;
  "ai.nudge_sent": Record<string, unknown>;
  "ai.nudge_result": Record<string, unknown>;
  "workflow.started": Record<string, unknown>;
  "workflow.step_advanced": Record<string, unknown>;
  "workflow.step_rejected": Record<string, unknown>;
  "workflow.completed": Record<string, unknown>;
  "workflow.abandoned": Record<string, unknown>;
  "connection.goaway_received": Record<string, unknown>;
  "connection.websocket_error": Record<string, unknown>;
}

export interface SessionEvent<E extends EventName = EventName> {
  event: E;
  sessionId: string;
  traceId: string;
  timestamp: number;
  data: EventDataMap[E];
}
