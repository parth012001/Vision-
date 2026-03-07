import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the callbacks and config passed to ai.live.connect so tests can fire/inspect them
let capturedCallbacks: Record<string, (...args: unknown[]) => void> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedConnectArg: Record<string, any> = {};
let mockSession: {
  close: ReturnType<typeof vi.fn>;
  sendRealtimeInput: ReturnType<typeof vi.fn>;
  sendClientContent: ReturnType<typeof vi.fn>;
  sendToolResponse: ReturnType<typeof vi.fn>;
};
let connectResolve: (session: typeof mockSession) => void;
let connectReject: (err: Error) => void;

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        live: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connect: vi.fn().mockImplementation(function (arg: any) {
            capturedCallbacks = arg.callbacks;
            capturedConnectArg = arg;
            return new Promise((resolve, reject) => {
              connectResolve = resolve;
              connectReject = reject;
            });
          }),
        },
      };
    }),
    Modality: { AUDIO: "AUDIO" },
  };
});

import { GeminiLiveClient, LiveEventHandler } from "@/lib/gemini-live-client";

function createMockSession() {
  return {
    close: vi.fn(),
    sendRealtimeInput: vi.fn(),
    sendClientContent: vi.fn(),
    sendToolResponse: vi.fn(),
  };
}

describe("GeminiLiveClient", () => {
  let handlers: Required<LiveEventHandler>;

  beforeEach(() => {
    capturedCallbacks = {};
    capturedConnectArg = {};
    mockSession = createMockSession();
    handlers = {
      onAudio: vi.fn(),
      onText: vi.fn(),
      onTurnComplete: vi.fn(),
      onInterrupted: vi.fn(),
      onError: vi.fn(),
      onClose: vi.fn(),
      onOpen: vi.fn(),
      onGoAway: vi.fn(),
      onSessionResumptionUpdate: vi.fn(),
      onToolCall: vi.fn(),
    };
  });

  describe("connect", () => {
    it("resolves after onopen fires", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });

      // Simulate SDK calling onopen then resolving the session
      capturedCallbacks.onopen();
      connectResolve(mockSession);

      await connectPromise;
      expect(handlers.onOpen).toHaveBeenCalledOnce();
      expect(client.isConnected).toBe(true);
    });

    it("rejects when onerror fires before onopen", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });

      capturedCallbacks.onerror({ message: "connection failed" });

      await expect(connectPromise).rejects.toThrow("connection failed");
      expect(handlers.onError).toHaveBeenCalled();
    });

    it("rejects when onclose fires before onopen", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });

      capturedCallbacks.onclose();

      await expect(connectPromise).rejects.toThrow(
        "Connection closed before it opened"
      );
    });

    it("rejects when SDK connect() promise rejects", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });

      connectReject(new Error("SDK connect failed"));

      await expect(connectPromise).rejects.toThrow("SDK connect failed");
    });
  });

  describe("disconnect during handshake", () => {
    it("rejects pending connect promise", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });

      client.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "Disconnected during handshake"
      );
    });

    it("closes orphaned session when connect completes after disconnect", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });

      client.disconnect();

      // SDK resolves the session after we've disconnected
      connectResolve(mockSession);

      await expect(connectPromise).rejects.toThrow();

      // Wait for microtask to process the .then()
      await vi.waitFor(() => {
        expect(mockSession.close).toHaveBeenCalled();
      });
    });
  });

  describe("generation counter / stale callbacks", () => {
    it("ignores onopen from stale connection", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const firstConnect = client.connect({ systemInstruction: "system prompt" });
      const staleOnopen = capturedCallbacks.onopen;

      client.disconnect();
      await expect(firstConnect).rejects.toThrow();

      // Start a new connection
      const secondConnect = client.connect({ systemInstruction: "system prompt" });

      // Fire onopen from the stale first connection — should be ignored
      staleOnopen();
      expect(handlers.onOpen).not.toHaveBeenCalled();

      // Fire onopen from the current connection
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await secondConnect;

      expect(handlers.onOpen).toHaveBeenCalledOnce();
    });

    it("ignores onmessage from stale connection", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const firstConnect = client.connect({ systemInstruction: "system prompt" });
      const staleOnmessage = capturedCallbacks.onmessage;

      client.disconnect();
      await expect(firstConnect).rejects.toThrow();

      // Fire onmessage from the stale connection
      staleOnmessage({
        serverContent: {
          modelTurn: { parts: [{ text: "stale message" }] },
        },
      });

      expect(handlers.onText).not.toHaveBeenCalled();
    });
  });

  describe("handleMessage", () => {
    async function createConnectedClient() {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await connectPromise;
      return client;
    }

    it("extracts text from modelTurn parts", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        serverContent: {
          modelTurn: { parts: [{ text: "Hello world" }] },
        },
      });
      expect(handlers.onText).toHaveBeenCalledWith("Hello world");
    });

    it("extracts audio data from inlineData parts", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        serverContent: {
          modelTurn: {
            parts: [
              {
                inlineData: {
                  data: "base64audio",
                  mimeType: "audio/pcm",
                },
              },
            ],
          },
        },
      });
      expect(handlers.onAudio).toHaveBeenCalledWith("base64audio");
    });

    it("ignores non-audio inlineData", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        serverContent: {
          modelTurn: {
            parts: [
              {
                inlineData: {
                  data: "base64image",
                  mimeType: "image/jpeg",
                },
              },
            ],
          },
        },
      });
      expect(handlers.onAudio).not.toHaveBeenCalled();
    });

    it("fires onTurnComplete", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        serverContent: { turnComplete: true },
      });
      expect(handlers.onTurnComplete).toHaveBeenCalledOnce();
    });

    it("fires onInterrupted", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        serverContent: { interrupted: true },
      });
      expect(handlers.onInterrupted).toHaveBeenCalledOnce();
    });

    it("extracts text from outputTranscription", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        serverContent: {
          outputTranscription: { text: "transcribed text" },
        },
      });
      expect(handlers.onText).toHaveBeenCalledWith("transcribed text");
    });

    it("ignores null/undefined messages", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage(null);
      capturedCallbacks.onmessage(undefined);
      expect(handlers.onText).not.toHaveBeenCalled();
      expect(handlers.onAudio).not.toHaveBeenCalled();
    });

    it("ignores messages without serverContent", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({ somethingElse: true });
      expect(handlers.onText).not.toHaveBeenCalled();
    });
  });

  describe("sendAudio / sendVideo / sendText", () => {
    it("sends audio when connected", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const p = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await p;

      client.sendAudio("base64data");
      expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith({
        audio: { data: "base64data", mimeType: "audio/pcm;rate=16000" },
      });
    });

    it("sends video when connected", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const p = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await p;

      client.sendVideo("jpegdata");
      expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith({
        media: { data: "jpegdata", mimeType: "image/jpeg" },
      });
    });

    it("sends text when connected", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const p = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await p;

      client.sendText("hello");
      expect(mockSession.sendClientContent).toHaveBeenCalledWith({
        turns: [{ role: "user", parts: [{ text: "hello" }] }],
      });
    });

    it("silently no-ops sendAudio when disconnected", () => {
      const client = new GeminiLiveClient("test-token", handlers);
      // Not connected — should not throw
      client.sendAudio("data");
      expect(mockSession.sendRealtimeInput).not.toHaveBeenCalled();
    });

    it("silently no-ops sendVideo when disconnected", () => {
      const client = new GeminiLiveClient("test-token", handlers);
      client.sendVideo("data");
      expect(mockSession.sendRealtimeInput).not.toHaveBeenCalled();
    });

    it("silently no-ops sendText when disconnected", () => {
      const client = new GeminiLiveClient("test-token", handlers);
      client.sendText("hello");
      expect(mockSession.sendClientContent).not.toHaveBeenCalled();
    });
  });

  describe("context window compression config", () => {
    it("includes compression config in connect call", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      client.connect({ systemInstruction: "system prompt" });

      expect(capturedConnectArg.config.contextWindowCompression).toEqual({
        triggerTokens: "80000",
        slidingWindow: { targetTokens: "40000" },
      });
    });
  });

  describe("session resumption config", () => {
    it("omits sessionResumption on fresh connect", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      client.connect({ systemInstruction: "system prompt" });

      expect(capturedConnectArg.config.sessionResumption).toBeUndefined();
    });

    it("sends provided handle on reconnect", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      client.connect({
        systemInstruction: "system prompt",
        resumptionHandle: "abc-handle-123",
      });

      expect(capturedConnectArg.config.sessionResumption).toEqual({
        handle: "abc-handle-123",
      });
    });
  });

  describe("GoAway handling", () => {
    async function createConnectedClient() {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await connectPromise;
      return client;
    }

    it("fires onGoAway with parsed duration in milliseconds", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        goAway: { timeLeft: "120s" },
      });
      expect(handlers.onGoAway).toHaveBeenCalledWith(120_000);
    });

    it("handles fractional seconds in GoAway duration", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        goAway: { timeLeft: "30.5s" },
      });
      expect(handlers.onGoAway).toHaveBeenCalledWith(30_500);
    });

    it("fires onGoAway with 0 when timeLeft is missing", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        goAway: {},
      });
      expect(handlers.onGoAway).toHaveBeenCalledWith(0);
    });

    it("fires onGoAway with 0 for unparseable duration", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        goAway: { timeLeft: "invalid" },
      });
      expect(handlers.onGoAway).toHaveBeenCalledWith(0);
    });
  });

  describe("session resumption update handling", () => {
    async function createConnectedClient() {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await connectPromise;
      return client;
    }

    it("fires onSessionResumptionUpdate with handle and resumable flag", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        sessionResumptionUpdate: {
          newHandle: "handle-xyz",
          resumable: true,
        },
      });
      expect(handlers.onSessionResumptionUpdate).toHaveBeenCalledWith(
        "handle-xyz",
        true
      );
    });

    it("defaults resumable to false when not provided", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        sessionResumptionUpdate: {
          newHandle: "handle-abc",
        },
      });
      expect(handlers.onSessionResumptionUpdate).toHaveBeenCalledWith(
        "handle-abc",
        false
      );
    });

    it("does not fire callback when newHandle is missing", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        sessionResumptionUpdate: {
          resumable: true,
        },
      });
      expect(handlers.onSessionResumptionUpdate).not.toHaveBeenCalled();
    });
  });

  describe("toolCall handling", () => {
    async function createConnectedClient() {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await connectPromise;
      return client;
    }

    it("fires onToolCall with parsed function calls", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        toolCall: {
          functionCalls: [
            { name: "advance_step", args: { step_id: "weigh_beans" }, id: "call-1" },
          ],
        },
      });
      expect(handlers.onToolCall).toHaveBeenCalledWith([
        { name: "advance_step", args: { step_id: "weigh_beans" }, id: "call-1" },
      ]);
    });

    it("handles function calls with no args", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        toolCall: {
          functionCalls: [
            { name: "get_current_step", id: "call-2" },
          ],
        },
      });
      expect(handlers.onToolCall).toHaveBeenCalledWith([
        { name: "get_current_step", args: {}, id: "call-2" },
      ]);
    });

    it("does not fire onToolCall for messages without toolCall", async () => {
      await createConnectedClient();
      capturedCallbacks.onmessage({
        serverContent: { turnComplete: true },
      });
      expect(handlers.onToolCall).not.toHaveBeenCalled();
    });
  });

  describe("sendToolResponse", () => {
    it("sends tool response when connected", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const p = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await p;

      const responses = [{ id: "call-1", response: { success: true } }];
      client.sendToolResponse(responses);
      expect(mockSession.sendToolResponse).toHaveBeenCalledWith({
        functionResponses: responses,
      });
    });

    it("silently no-ops sendToolResponse when disconnected", () => {
      const client = new GeminiLiveClient("test-token", handlers);
      client.sendToolResponse([{ id: "call-1", response: { success: true } }]);
      expect(mockSession.sendToolResponse).not.toHaveBeenCalled();
    });
  });

  describe("tools in connect config", () => {
    it("passes tools through to SDK config", () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const tools = [{ functionDeclarations: [{ name: "test_fn" }] }];
      client.connect({ systemInstruction: "system prompt", tools });

      expect(capturedConnectArg.config.tools).toEqual(tools);
    });

    it("omits tools when not provided", () => {
      const client = new GeminiLiveClient("test-token", handlers);
      client.connect({ systemInstruction: "system prompt" });

      expect(capturedConnectArg.config.tools).toBeUndefined();
    });
  });

  describe("disconnect", () => {
    it("closes session and sets isConnected to false", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const p = client.connect({ systemInstruction: "system prompt" });
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await p;

      expect(client.isConnected).toBe(true);
      client.disconnect();
      expect(client.isConnected).toBe(false);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("is safe to call when not connected", () => {
      const client = new GeminiLiveClient("test-token", handlers);
      expect(() => client.disconnect()).not.toThrow();
    });
  });
});
