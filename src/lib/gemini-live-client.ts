import { GoogleGenAI, Modality, Session } from "@google/genai";
import type { LiveConnectConfig, LiveServerMessage } from "@google/genai";
import { LIVE_MODEL } from "./constants";

export type LiveEventHandler = {
  onAudio?: (base64Pcm: string) => void;
  onText?: (text: string) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onOpen?: () => void;
};

/**
 * Manages a Gemini Live API session.
 * Connects via @google/genai SDK's live.connect, sends audio/video,
 * and dispatches received audio/text to handlers.
 */
export class GeminiLiveClient {
  private session: Session | null = null;
  private handlers: LiveEventHandler;
  private apiKey: string;

  constructor(apiKey: string, handlers: LiveEventHandler) {
    this.apiKey = apiKey;
    this.handlers = handlers;
  }

  async connect(systemInstruction: string): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const config: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      systemInstruction,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede",
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };

    this.session = await ai.live.connect({
      model: LIVE_MODEL,
      config,
      callbacks: {
        onopen: () => {
          this.handlers.onOpen?.();
        },
        onmessage: (msg: LiveServerMessage) => {
          this.handleMessage(msg);
        },
        onerror: (e: ErrorEvent) => {
          this.handlers.onError?.(new Error(e?.message || "WebSocket error"));
        },
        onclose: () => {
          this.handlers.onClose?.();
        },
      },
    });
  }

  private handleMessage(data: unknown) {
    if (!data || typeof data !== "object") return;

    const msg = data as Record<string, unknown>;

    // Handle server content (audio + text)
    const serverContent = msg.serverContent as Record<string, unknown> | undefined;
    if (serverContent) {
      // Check for interruption
      if (serverContent.interrupted) {
        this.handlers.onInterrupted?.();
      }

      const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
      if (modelTurn?.parts) {
        const parts = modelTurn.parts as Array<Record<string, unknown>>;
        for (const part of parts) {
          if (part.text) {
            this.handlers.onText?.(part.text as string);
          }
          if (part.inlineData) {
            const inlineData = part.inlineData as { data: string; mimeType: string };
            if (inlineData.mimeType?.startsWith("audio/")) {
              this.handlers.onAudio?.(inlineData.data);
            }
          }
        }
      }

      if (serverContent.turnComplete) {
        this.handlers.onTurnComplete?.();
      }

      // Handle output audio transcription
      const outputTranscription = serverContent.outputTranscription as Record<string, unknown> | undefined;
      if (outputTranscription?.text) {
        this.handlers.onText?.(outputTranscription.text as string);
      }
    }

    // Handle input transcription
    const inputTranscription = (msg as Record<string, unknown>).inputTranscription as Record<string, unknown> | undefined;
    if (inputTranscription?.text) {
      // Could emit a separate event for user transcription if needed
    }
  }

  sendAudio(base64Data: string) {
    if (!this.session) return;
    const blob = { data: base64Data, mimeType: "audio/pcm;rate=16000" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.session.sendRealtimeInput({ audio: blob as any });
  }

  sendVideo(base64Data: string) {
    if (!this.session) return;
    const blob = { data: base64Data, mimeType: "image/jpeg" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.session.sendRealtimeInput({ video: blob as any });
  }

  sendText(text: string) {
    if (!this.session) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
    });
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  get isConnected(): boolean {
    return this.session !== null;
  }
}
