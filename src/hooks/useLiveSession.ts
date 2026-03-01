"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { GeminiLiveClient } from "@/lib/gemini-live-client";
import { useAudioCapture } from "./useAudioCapture";
import { useAudioPlayback } from "./useAudioPlayback";
import { useCameraCapture } from "./useCameraCapture";
import { buildSystemPrompt } from "@/knowledge/system-prompt";
import {
  RECONNECT_MAX_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_TOAST_DURATION_MS,
} from "@/lib/constants";
import type { SessionStatus, AIState, TranscriptEntry } from "@/types/session";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useLiveSession() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [aiState, setAiState] = useState<AIState>("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showReconnectToast, setShowReconnectToast] = useState(false);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const connectAttemptRef = useRef(0);
  const currentTextRef = useRef<string>("");
  const userDisconnectedRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const resumptionHandleRef = useRef<string | undefined>(undefined);
  const goAwayTriggeredRef = useRef(false);

  const {
    playChunk,
    stop: stopPlayback,
    resume: resumeAudio,
    cleanup: cleanupAudio,
    init: initAudio,
  } = useAudioPlayback({
    onPlayingChange: (playing) => {
      setAiState(playing ? "speaking" : "listening");
    },
  });

  const { start: startMic, stop: stopMic } = useAudioCapture({
    onAudioData: useCallback((base64: string) => {
      clientRef.current?.sendAudio(base64);
    }, []),
  });

  const { videoRef, start: startCamera, stop: stopCamera } = useCameraCapture({
    onFrame: useCallback((base64: string) => {
      clientRef.current?.sendVideo(base64);
    }, []),
    enabled: isCameraOn,
  });

  const addTranscriptEntry = useCallback(
    (role: "user" | "model", text: string) => {
      if (!text.trim()) return;
      setTranscript((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role,
          text: text.trim(),
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );

  const dismissReconnectToast = useCallback(() => {
    setShowReconnectToast(false);
  }, []);

  // Shared connect logic used by both user-initiated connect and auto-reconnect.
  // `isReconnect` controls whether status is set to "connecting" vs "reconnecting".
  const connectInner = useCallback(
    async (isReconnect: boolean) => {
      let client: GeminiLiveClient | null = null;

      const localAttempt = ++connectAttemptRef.current;
      const isStale = () => connectAttemptRef.current !== localAttempt;

      try {
        setStatus(isReconnect ? "reconnecting" : "connecting");
        setError(null);

        // 1. Fetch ephemeral token (single-use, fresh each time)
        const tokenRes = await fetch("/api/token", { method: "POST" });
        if (isStale()) return;
        if (!tokenRes.ok) {
          throw new Error(`Token request failed (${tokenRes.status})`);
        }
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error);
        const { token } = tokenData;
        if (!token || typeof token !== "string") {
          throw new Error("Server returned an invalid token");
        }

        // 2. Initialize audio playback (needs user gesture context)
        initAudio();
        await resumeAudio();
        if (isStale()) return;

        // 3. Create the client with event handlers
        client = new GeminiLiveClient(token, {
          onOpen: () => {},
          onAudio: (base64Pcm) => {
            playChunk(base64Pcm);
          },
          onText: (text) => {
            currentTextRef.current += text;
          },
          onTurnComplete: () => {
            if (currentTextRef.current) {
              addTranscriptEntry("model", currentTextRef.current);
              currentTextRef.current = "";
            }
            setAiState("listening");
          },
          onInterrupted: () => {
            stopPlayback();
            currentTextRef.current = "";
            setAiState("listening");
          },
          onError: (err) => {
            if (clientRef.current !== client) return;
            console.error("Live session error:", err);
            stopMic();
            stopCamera();
            stopPlayback();
            cleanupAudio();
            const prevClient = clientRef.current;
            clientRef.current = null;
            currentTextRef.current = "";

            // Auto-reconnect if this was an established session and user didn't disconnect
            if (!userDisconnectedRef.current && wasConnectedRef.current && prevClient === client) {
              scheduleReconnect();
            } else {
              setError(err.message);
              setStatus("error");
              setAiState("idle");
            }
          },
          onClose: () => {
            if (clientRef.current !== client) return;
            stopMic();
            stopCamera();
            stopPlayback();
            cleanupAudio();
            const prevClient = clientRef.current;
            clientRef.current = null;
            currentTextRef.current = "";

            // Auto-reconnect if this was an established session and user didn't disconnect
            if (!userDisconnectedRef.current && wasConnectedRef.current && prevClient === client) {
              scheduleReconnect();
            } else {
              setStatus("disconnected");
              setAiState("idle");
            }
          },
          onSessionResumptionUpdate: (handle, resumable) => {
            if (resumable) {
              resumptionHandleRef.current = handle;
            }
          },
          onGoAway: () => {
            if (!client || clientRef.current !== client) return;
            goAwayTriggeredRef.current = true;
            stopMic();
            stopCamera();
            stopPlayback();
            cleanupAudio();
            clientRef.current = null;
            currentTextRef.current = "";
            client.disconnect();
            scheduleReconnect();
          },
        });

        clientRef.current = client;

        // 4. Connect and wait for WebSocket to be fully open
        const systemPrompt = buildSystemPrompt();
        await client.connect({
          systemInstruction: systemPrompt,
          resumptionHandle: resumptionHandleRef.current,
        });

        // 5. Connection confirmed — start media
        if (clientRef.current !== client) {
          client.disconnect();
          return;
        }
        setStatus("connected");
        wasConnectedRef.current = true;
        setAiState("listening");
        await startMic();
        if (clientRef.current !== client) {
          stopMic();
          client.disconnect();
          return;
        }
        await startCamera();
        if (clientRef.current !== client) {
          stopCamera();
          stopMic();
          client.disconnect();
          return;
        }
      } catch (err) {
        console.error("Connection failed:", err);
        client?.disconnect();

        if (!isStale()) {
          stopMic();
          stopCamera();
          stopPlayback();
          if (clientRef.current === client) {
            clientRef.current = null;
          }
          cleanupAudio();
          currentTextRef.current = "";
        }

        // Re-throw so scheduleReconnect's catch can handle retries
        throw err;
      }
    },
    [
      initAudio,
      resumeAudio,
      playChunk,
      stopPlayback,
      addTranscriptEntry,
      startMic,
      startCamera,
      stopMic,
      stopCamera,
      cleanupAudio,
    ]
  );

  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion with connectInner handlers
  const scheduleReconnect = useCallback(async () => {
    const attemptGeneration = connectAttemptRef.current;
    const isGoAway = goAwayTriggeredRef.current;
    goAwayTriggeredRef.current = false;

    for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
      if (userDisconnectedRef.current || unmountedRef.current) return;
      if (connectAttemptRef.current !== attemptGeneration) return;

      setStatus("reconnecting");
      setAiState("idle");

      // Skip delay on first attempt if triggered by GoAway (proactive reconnect)
      if (!(isGoAway && attempt === 1)) {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      if (userDisconnectedRef.current || unmountedRef.current) return;
      if (connectAttemptRef.current !== attemptGeneration) return;

      try {
        await connectInner(true);
        // Success — show toast
        setShowReconnectToast(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          setShowReconnectToast(false);
        }, RECONNECT_TOAST_DURATION_MS);
        return;
      } catch {
        // Will retry on next iteration
        continue;
      }
    }

    // Exhausted all attempts — clear stale handle
    resumptionHandleRef.current = undefined;
    if (!userDisconnectedRef.current && !unmountedRef.current) {
      setError("Connection lost. Please try again.");
      setStatus("error");
      setAiState("idle");
    }
  }, [connectInner]);

  const connect = useCallback(async () => {
    userDisconnectedRef.current = false;
    wasConnectedRef.current = false;
    resumptionHandleRef.current = undefined;

    const localAttempt = connectAttemptRef.current;

    try {
      await connectInner(false);
    } catch (err) {
      if (connectAttemptRef.current === localAttempt) {
        setError(err instanceof Error ? err.message : "Connection failed");
        setStatus("error");
        setAiState("idle");
      }
    }
  }, [connectInner]);

  const disconnect = useCallback(() => {
    userDisconnectedRef.current = true;
    wasConnectedRef.current = false;
    resumptionHandleRef.current = undefined;

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connectAttemptRef.current++;
    stopMic();
    stopCamera();
    stopPlayback();
    clientRef.current?.disconnect();
    clientRef.current = null;
    cleanupAudio();
    currentTextRef.current = "";
    setStatus("disconnected");
    setAiState("idle");
  }, [stopMic, stopCamera, stopPlayback, cleanupAudio]);

  const toggleMic = useCallback(() => {
    setIsMicOn((prev) => {
      if (prev) {
        stopMic();
      } else {
        startMic();
      }
      return !prev;
    });
  }, [startMic, stopMic]);

  const toggleCamera = useCallback(() => {
    setIsCameraOn((prev) => !prev);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      resumptionHandleRef.current = undefined;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      clientRef.current?.disconnect();
      clientRef.current = null;
      stopMic();
      stopCamera();
      cleanupAudio();
      currentTextRef.current = "";
    };
  }, [stopMic, stopCamera, cleanupAudio]);

  return {
    status,
    aiState,
    isMicOn,
    isCameraOn,
    transcript,
    error,
    videoRef,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    showReconnectToast,
    dismissReconnectToast,
  };
}
