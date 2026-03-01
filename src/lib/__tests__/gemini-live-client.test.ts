import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the callbacks passed to ai.live.connect so tests can fire them
let capturedCallbacks: Record<string, (...args: unknown[]) => void> = {};
let mockSession: {
  close: ReturnType<typeof vi.fn>;
  sendRealtimeInput: ReturnType<typeof vi.fn>;
  sendClientContent: ReturnType<typeof vi.fn>;
};
let connectResolve: (session: typeof mockSession) => void;
let connectReject: (err: Error) => void;

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        live: {
          connect: vi.fn().mockImplementation(function ({ callbacks }: { callbacks: Record<string, (...args: unknown[]) => void> }) {
            capturedCallbacks = callbacks;
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

import { GeminiLiveClient, LiveEventHandler } from "../gemini-live-client";

function createMockSession() {
  return {
    close: vi.fn(),
    sendRealtimeInput: vi.fn(),
    sendClientContent: vi.fn(),
  };
}

describe("GeminiLiveClient", () => {
  let handlers: Required<LiveEventHandler>;

  beforeEach(() => {
    capturedCallbacks = {};
    mockSession = createMockSession();
    handlers = {
      onAudio: vi.fn(),
      onText: vi.fn(),
      onTurnComplete: vi.fn(),
      onInterrupted: vi.fn(),
      onError: vi.fn(),
      onClose: vi.fn(),
      onOpen: vi.fn(),
    };
  });

  describe("connect", () => {
    it("resolves after onopen fires", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect("system prompt");

      // Simulate SDK calling onopen then resolving the session
      capturedCallbacks.onopen();
      connectResolve(mockSession);

      await connectPromise;
      expect(handlers.onOpen).toHaveBeenCalledOnce();
      expect(client.isConnected).toBe(true);
    });

    it("rejects when onerror fires before onopen", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect("system prompt");

      capturedCallbacks.onerror({ message: "connection failed" });

      await expect(connectPromise).rejects.toThrow("connection failed");
      expect(handlers.onError).toHaveBeenCalled();
    });

    it("rejects when onclose fires before onopen", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect("system prompt");

      capturedCallbacks.onclose();

      await expect(connectPromise).rejects.toThrow(
        "Connection closed before it opened"
      );
    });

    it("rejects when SDK connect() promise rejects", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect("system prompt");

      connectReject(new Error("SDK connect failed"));

      await expect(connectPromise).rejects.toThrow("SDK connect failed");
    });
  });

  describe("disconnect during handshake", () => {
    it("rejects pending connect promise", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect("system prompt");

      client.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "Disconnected during handshake"
      );
    });

    it("closes orphaned session when connect completes after disconnect", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const connectPromise = client.connect("system prompt");

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
      const firstConnect = client.connect("system prompt");
      const staleOnopen = capturedCallbacks.onopen;

      client.disconnect();
      await expect(firstConnect).rejects.toThrow();

      // Start a new connection
      const secondConnect = client.connect("system prompt");

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
      const firstConnect = client.connect("system prompt");
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
      const connectPromise = client.connect("system prompt");
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
      const p = client.connect("system prompt");
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
      const p = client.connect("system prompt");
      capturedCallbacks.onopen();
      connectResolve(mockSession);
      await p;

      client.sendVideo("jpegdata");
      expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith({
        video: { data: "jpegdata", mimeType: "image/jpeg" },
      });
    });

    it("sends text when connected", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const p = client.connect("system prompt");
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

  describe("disconnect", () => {
    it("closes session and sets isConnected to false", async () => {
      const client = new GeminiLiveClient("test-token", handlers);
      const p = client.connect("system prompt");
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
