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

export class GeminiLiveClient {
  private session: Session | null = null;
  private handlers: LiveEventHandler;
  private apiKey: string;
  private connected = false;

  constructor(apiKey: string, handlers: LiveEventHandler) {
    this.apiKey = apiKey;
    this.handlers = handlers;
  }

  /**
   * Connect to the Gemini Live API. The returned Promise resolves
   * only after the WebSocket is fully open and the session is ready
   * to accept audio/video input.
   */
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

    // Wrap in a Promise so the caller can await until onopen fires.
    // This prevents the race condition where mic/camera start sending
    // data before the WebSocket handshake completes.
    return new Promise<void>((resolve, reject) => {
      let settled = false;

      ai.live
        .connect({
          model: LIVE_MODEL,
          config,
          callbacks: {
            onopen: () => {
              this.connected = true;
              this.handlers.onOpen?.();
              if (!settled) {
                settled = true;
                resolve();
              }
            },
            onmessage: (msg: LiveServerMessage) => {
              this.handleMessage(msg);
            },
            onerror: (e: ErrorEvent) => {
              const error = new Error(e?.message || "WebSocket error");
              this.handlers.onError?.(error);
              if (!settled) {
                settled = true;
                reject(error);
              }
            },
            onclose: () => {
              this.connected = false;
              this.session = null;
              this.handlers.onClose?.();
              if (!settled) {
                settled = true;
                reject(new Error("Connection closed before it opened"));
              }
            },
          },
        })
        .then((session) => {
          this.session = session;
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
    });
  }

  private handleMessage(data: unknown) {
    if (!data || typeof data !== "object") return;

    const msg = data as Record<string, unknown>;

    const serverContent = msg.serverContent as
      | Record<string, unknown>
      | undefined;
    if (serverContent) {
      if (serverContent.interrupted) {
        this.handlers.onInterrupted?.();
      }

      const modelTurn = serverContent.modelTurn as
        | Record<string, unknown>
        | undefined;
      if (modelTurn?.parts) {
        const parts = modelTurn.parts as Array<Record<string, unknown>>;
        for (const part of parts) {
          if (part.text) {
            this.handlers.onText?.(part.text as string);
          }
          if (part.inlineData) {
            const inlineData = part.inlineData as {
              data: string;
              mimeType: string;
            };
            if (inlineData.mimeType?.startsWith("audio/")) {
              this.handlers.onAudio?.(inlineData.data);
            }
          }
        }
      }

      if (serverContent.turnComplete) {
        this.handlers.onTurnComplete?.();
      }

      const outputTranscription = serverContent.outputTranscription as
        | Record<string, unknown>
        | undefined;
      if (outputTranscription?.text) {
        this.handlers.onText?.(outputTranscription.text as string);
      }
    }
  }

  sendAudio(base64Data: string) {
    if (!this.session || !this.connected) return;
    const blob = { data: base64Data, mimeType: "audio/pcm;rate=16000" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.session.sendRealtimeInput({ audio: blob as any });
  }

  sendVideo(base64Data: string) {
    if (!this.session || !this.connected) return;
    const blob = { data: base64Data, mimeType: "image/jpeg" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.session.sendRealtimeInput({ video: blob as any });
  }

  sendText(text: string) {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
    });
  }

  disconnect() {
    this.connected = false;
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  get isConnected(): boolean {
    return this.connected && this.session !== null;
  }
}
