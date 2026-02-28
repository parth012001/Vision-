export type SessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type AIState = "idle" | "listening" | "speaking" | "thinking";

export interface SessionState {
  status: SessionStatus;
  aiState: AIState;
  isMicOn: boolean;
  isCameraOn: boolean;
  transcript: TranscriptEntry[];
  error: string | null;
}

export interface TranscriptEntry {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface SnapResult {
  imageDataUrl: string;
  analysis: string;
  timestamp: number;
}
