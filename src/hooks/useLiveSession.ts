"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { GeminiLiveClient } from "@/lib/gemini-live-client";
import { useAudioCapture } from "./useAudioCapture";
import { useAudioPlayback } from "./useAudioPlayback";
import { useCameraCapture } from "./useCameraCapture";
import { buildSystemPrompt } from "@/knowledge/personality/system-prompt";
import { captureFrame } from "@/lib/camera-utils";
import {
  RECONNECT_MAX_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_TOAST_DURATION_MS,
  WATCHDOG_NUDGE_MS,
  WATCHDOG_RECONNECT_MS,
} from "@/lib/constants";
import {
  WorkflowEngine,
  ESPRESSO_WORKFLOW,
  buildToolDeclarations,
  handleFunctionCall,
} from "@/lib/state-machine";
import { WatchdogTimer } from "@/lib/watchdog";
import { EventCollector } from "@/lib/event-collector";
import type { SessionStatus, AIState, TranscriptEntry } from "@/types/session";
import type { StepGuidancePayload } from "@/lib/state-machine";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function useLiveSession() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [aiState, setAiState] = useState<AIState>("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showReconnectToast, setShowReconnectToast] = useState(false);
  const [workflowProgress, setWorkflowProgress] = useState<StepGuidancePayload["progress"] | null>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const workflowEngineRef = useRef<WorkflowEngine>(new WorkflowEngine(ESPRESSO_WORKFLOW));
  const watchdogRef = useRef<WatchdogTimer | null>(null);

  const toolDeclarations = useRef(
    buildToolDeclarations(ESPRESSO_WORKFLOW)
  ).current;
  const connectAttemptRef = useRef(0);
  const currentTextRef = useRef<string>("");
  const userDisconnectedRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const resumptionHandleRef = useRef<string | undefined>(undefined);
  const goAwayTriggeredRef = useRef(false);
  const collectorRef = useRef<EventCollector | null>(null);
  const sessionIdRef = useRef("");
  const sessionStartTimeRef = useRef(0);

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
      const connectStartTime = Date.now();
      collectorRef.current?.setTraceId(crypto.randomUUID());

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
            watchdogRef.current?.kick();
            playChunk(base64Pcm);
          },
          onText: (text) => {
            watchdogRef.current?.kick();
            currentTextRef.current += text;
          },
          onTurnComplete: () => {
            watchdogRef.current?.kick();
            if (currentTextRef.current) {
              addTranscriptEntry("model", currentTextRef.current);
              currentTextRef.current = "";
            }
            setAiState("listening");

            // Inject a fresh frame via the ordered path so the next
            // model response starts from the latest visual state.
            if (videoRef.current && clientRef.current?.isConnected) {
              const freshFrame = captureFrame(videoRef.current);
              if (freshFrame) {
                clientRef.current.sendVideoOrdered(freshFrame);
              }
            }
          },
          onToolCall: (functionCalls) => {
            watchdogRef.current?.kick();
            const responses = functionCalls.map((fc) => {
              const output = handleFunctionCall(workflowEngineRef.current, fc);
              // Update progress state if the response contains it
              const data = output.response.data as Record<string, unknown> | undefined;
              if (output.response.success && data && "progress" in data) {
                setWorkflowProgress(data.progress as StepGuidancePayload["progress"]);
              }
              return output;
            });
            clientRef.current?.sendToolResponse(responses);
          },
          onInterrupted: () => {
            stopPlayback();
            currentTextRef.current = "";
            setAiState("listening");
          },
          onError: (err) => {
            if (clientRef.current !== client) return;
            console.error("Live session error:", err);
            collectorRef.current?.track("session.error", {
              errorMessage: err.message,
              sessionAgeMs: Date.now() - sessionStartTimeRef.current,
            });
            collectorRef.current?.track("session.disconnected", {
              reason: "error",
              sessionDurationMs: Date.now() - sessionStartTimeRef.current,
            });
            watchdogRef.current?.stop();
            stopMic();
            stopCamera();
            stopPlayback();
            cleanupAudio();
            const prevClient = clientRef.current;
            clientRef.current = null;
            currentTextRef.current = "";

            // Auto-reconnect if this was an established session and user didn't disconnect
            if (!userDisconnectedRef.current && wasConnectedRef.current && prevClient === client) {
              scheduleReconnect("error");
            } else {
              setError(err.message);
              setStatus("error");
              setAiState("idle");
            }
          },
          onClose: () => {
            if (clientRef.current !== client) return;
            collectorRef.current?.track("session.disconnected", {
              reason: "close" as const,
              sessionDurationMs: Date.now() - sessionStartTimeRef.current,
            });
            watchdogRef.current?.stop();
            stopMic();
            stopCamera();
            stopPlayback();
            cleanupAudio();
            const prevClient = clientRef.current;
            clientRef.current = null;
            currentTextRef.current = "";

            // Auto-reconnect if this was an established session and user didn't disconnect
            if (!userDisconnectedRef.current && wasConnectedRef.current && prevClient === client) {
              scheduleReconnect("close");
            } else {
              setStatus("disconnected");
              setAiState("idle");
            }
          },
          onSessionResumptionUpdate: (handle, resumable) => {
            resumptionHandleRef.current = resumable ? handle : undefined;
          },
          onGoAway: () => {
            if (!client || clientRef.current !== client) return;
            collectorRef.current?.track("session.disconnected", {
              reason: "goaway" as const,
              sessionDurationMs: Date.now() - sessionStartTimeRef.current,
            });
            goAwayTriggeredRef.current = true;
            watchdogRef.current?.stop();
            stopMic();
            stopCamera();
            stopPlayback();
            cleanupAudio();
            clientRef.current = null;
            currentTextRef.current = "";
            client.disconnect();
            scheduleReconnect("goaway");
          },
        });

        clientRef.current = client;

        // 4. Connect and wait for WebSocket to be fully open
        // System prompt is baked into the ephemeral token server-side.
        // We also inject it mid-session as a fallback in case the
        // constrained endpoint doesn't propagate it.
        const systemPrompt = buildSystemPrompt();
        await client.connect({
          resumptionHandle: resumptionHandleRef.current,
          tools: [{ functionDeclarations: toolDeclarations }],
        });

        // 5. Connection confirmed — inject system instruction as fallback
        if (clientRef.current !== client) {
          client.disconnect();
          return;
        }
        client.sendSystemInstruction(systemPrompt);

        // 6. Start watchdog timer
        watchdogRef.current?.stop();
        watchdogRef.current = new WatchdogTimer({
          nudgeDelayMs: WATCHDOG_NUDGE_MS,
          reconnectDelayMs: WATCHDOG_RECONNECT_MS,
          onNudge: () => {
            clientRef.current?.sendText(
              "[System: The user has been silent for a while. Check in with them — " +
              "ask if they need help or are ready for the next step.]"
            );
          },
          onReconnect: () => {
            if (clientRef.current?.isConnected) {
              console.warn("Watchdog: AI unresponsive for 30s, forcing reconnect");
              collectorRef.current?.track("session.disconnected", {
                reason: "watchdog" as const,
                sessionDurationMs: Date.now() - sessionStartTimeRef.current,
              });
              watchdogRef.current?.stop();
              const prevClient = clientRef.current;
              clientRef.current = null;
              prevClient.disconnect();
              scheduleReconnect("watchdog");
            }
          },
        });
        watchdogRef.current.start();

        // 7. After reconnect, prompt AI to recover workflow state
        if (isReconnect && workflowEngineRef.current.getCurrentStepId()) {
          client.sendText(
            "[System: Session reconnected. Call get_current_step() to recover your place in the workflow.]"
          );
        }

        setStatus("connected");
        collectorRef.current?.track("session.connected", {
          connectionDurationMs: Date.now() - connectStartTime,
          isReconnect,
        });
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
  const scheduleReconnect = useCallback(async (disconnectReason: "error" | "close" | "goaway" | "watchdog" = "close") => {
    const isGoAway = goAwayTriggeredRef.current;
    goAwayTriggeredRef.current = false;

    for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
      if (userDisconnectedRef.current || unmountedRef.current) return;

      setStatus("reconnecting");
      setAiState("idle");
      const reconnectDowntimeStart = Date.now();
      collectorRef.current?.track("session.reconnecting", {
        attemptNumber: attempt,
        reason: disconnectReason,
      });

      // Skip delay on first attempt if triggered by GoAway (proactive reconnect)
      if (!(isGoAway && attempt === 1)) {
        const generationBeforeSleep = connectAttemptRef.current;
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
        if (userDisconnectedRef.current || unmountedRef.current) return;
        if (connectAttemptRef.current !== generationBeforeSleep) return;
      }

      // connectInner increments connectAttemptRef on entry; snapshot what it'll become
      const expectedAttempt = connectAttemptRef.current + 1;

      try {
        await connectInner(true);
        collectorRef.current?.track("session.reconnected", {
          attemptNumber: attempt,
          downtimeMs: Date.now() - reconnectDowntimeStart,
        });
        // Success — show toast
        setShowReconnectToast(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          setShowReconnectToast(false);
        }, RECONNECT_TOAST_DURATION_MS);
        return;
      } catch {
        // If an external connect/disconnect changed the generation, stop retrying
        if (connectAttemptRef.current !== expectedAttempt) return;
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

    // Initialize event collector for this session
    const sessionId = crypto.randomUUID();
    sessionIdRef.current = sessionId;
    sessionStartTimeRef.current = Date.now();
    collectorRef.current?.destroy();
    collectorRef.current = new EventCollector({ sessionId });
    collectorRef.current.track("session.started", {
      userAgent: navigator.userAgent,
      deviceType: detectDeviceType(),
    });

    // connectInner increments connectAttemptRef on entry; snapshot what it'll become
    const expectedAttempt = connectAttemptRef.current + 1;

    try {
      await connectInner(false);
    } catch (err) {
      if (connectAttemptRef.current === expectedAttempt) {
        setError(err instanceof Error ? err.message : "Connection failed");
        setStatus("error");
        setAiState("idle");
      }
    }
  }, [connectInner]);

  const disconnect = useCallback(() => {
    userDisconnectedRef.current = true;
    collectorRef.current?.track("session.disconnected", {
      reason: "user" as const,
      sessionDurationMs: Date.now() - sessionStartTimeRef.current,
    });
    collectorRef.current?.flush();
    wasConnectedRef.current = false;
    resumptionHandleRef.current = undefined;

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    watchdogRef.current?.stop();
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
      watchdogRef.current?.stop();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      clientRef.current?.disconnect();
      clientRef.current = null;
      collectorRef.current?.destroy();
      collectorRef.current = null;
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
    workflowProgress,
  };
}
