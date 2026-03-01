import { GoogleGenAI, Modality, Session } from "@google/genai";
import type { LiveConnectConfig, LiveServerMessage } from "@google/genai";
import {
  LIVE_MODEL,
  COMPRESSION_TRIGGER_TOKENS,
  COMPRESSION_TARGET_TOKENS,
} from "./constants";

export interface LiveConnectOptions {
  systemInstruction: string;
  resumptionHandle?: string;
}

export type LiveEventHandler = {
  onAudio?: (base64Pcm: string) => void;
  onText?: (text: string) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onOpen?: () => void;
  onGoAway?: (timeLeftMs: number) => void;
  onSessionResumptionUpdate?: (handle: string, resumable: boolean) => void;
};

export class GeminiLiveClient {
  private session: Session | null = null;
  private handlers: LiveEventHandler;
  private token: string;
  private connected = false;
  private connectGeneration = 0;
  private pendingReject: ((err: Error) => void) | null = null;

  constructor(token: string, handlers: LiveEventHandler) {
    this.token = token;
    this.handlers = handlers;
  }

  /**
   * Connect to the Gemini Live API. The returned Promise resolves
   * only after the WebSocket is fully open and the session is ready
   * to accept audio/video input.
   */
  async connect(options: LiveConnectOptions): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: this.token, httpOptions: { apiVersion: "v1alpha" } });

    const config: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      systemInstruction: options.systemInstruction,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede",
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: {
        triggerTokens: COMPRESSION_TRIGGER_TOKENS,
        slidingWindow: { targetTokens: COMPRESSION_TARGET_TOKENS },
      },
      sessionResumption: {
        handle: options.resumptionHandle,
      },
    };

    // Bump generation so any in-flight connect from a previous call
    // becomes stale and its callbacks are ignored.
    const generation = ++this.connectGeneration;
    const isStale = () => generation !== this.connectGeneration;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      this.pendingReject = (err: Error) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      ai.live
        .connect({
          model: LIVE_MODEL,
          config,
          callbacks: {
            onopen: () => {
              if (isStale()) return;
              this.connected = true;
              this.handlers.onOpen?.();
              if (!settled) {
                settled = true;
                this.pendingReject = null;
                resolve();
              }
            },
            onmessage: (msg: LiveServerMessage) => {
              if (isStale()) return;
              this.handleMessage(msg);
            },
            onerror: (e: ErrorEvent) => {
              if (isStale()) return;
              const error = new Error(e?.message || "WebSocket error");
              this.handlers.onError?.(error);
              if (!settled) {
                settled = true;
                reject(error);
              }
            },
            onclose: () => {
              if (isStale()) return;
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
          if (isStale()) {
            // Connection completed but we've since disconnected or
            // started a new connection — close the orphaned session.
            session.close();
            return;
          }
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

  private parseDuration(s: string): number {
    const match = s.match(/^(\d+(?:\.\d+)?)s$/);
    return match ? parseFloat(match[1]) * 1000 : 0;
  }

  private handleMessage(data: unknown) {
    if (!data || typeof data !== "object") return;

    const msg = data as Record<string, unknown>;

    // GoAway — server warns before dropping the connection
    const goAway = msg.goAway as Record<string, unknown> | undefined;
    if (goAway) {
      const timeLeft = goAway.timeLeft as string | undefined;
      const timeLeftMs = timeLeft ? this.parseDuration(timeLeft) : 0;
      this.handlers.onGoAway?.(timeLeftMs);
    }

    // Session Resumption Update — server provides a handle for reconnect
    const sessionResumptionUpdate = msg.sessionResumptionUpdate as
      | Record<string, unknown>
      | undefined;
    if (sessionResumptionUpdate) {
      const newHandle = sessionResumptionUpdate.newHandle as string | undefined;
      const resumable = sessionResumptionUpdate.resumable as boolean | undefined;
      if (newHandle) {
        this.handlers.onSessionResumptionUpdate?.(newHandle, resumable ?? false);
      }
    }

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
    // Bump generation to invalidate any in-flight connect handshake.
    this.connectGeneration++;
    this.connected = false;

    // Reject any pending connect() Promise so the caller isn't left hanging.
    if (this.pendingReject) {
      this.pendingReject(new Error("Disconnected during handshake"));
      this.pendingReject = null;
    }

    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  get isConnected(): boolean {
    return this.connected && this.session !== null;
  }
}
