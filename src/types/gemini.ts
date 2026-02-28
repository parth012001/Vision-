export interface LiveMessage {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
  setupComplete?: Record<string, never>;
}

export interface AudioChunk {
  data: string; // base64
  mimeType: string;
}

export interface VideoFrame {
  data: string; // base64 JPEG
  mimeType: string;
}
