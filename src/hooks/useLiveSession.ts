"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { GeminiLiveClient } from "@/lib/gemini-live-client";
import { useAudioCapture } from "./useAudioCapture";
import { useAudioPlayback } from "./useAudioPlayback";
import { useCameraCapture } from "./useCameraCapture";
import { buildSystemPrompt } from "@/knowledge/system-prompt";
import type { SessionStatus, AIState, TranscriptEntry } from "@/types/session";

export function useLiveSession() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [aiState, setAiState] = useState<AIState>("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const currentTextRef = useRef<string>("");

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

  const connect = useCallback(async () => {
    let client: GeminiLiveClient | null = null;

    try {
      setStatus("connecting");
      setError(null);

      // 1. Fetch ephemeral token from server
      const tokenRes = await fetch("/api/token", { method: "POST" });
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

      // 3. Create the client with event handlers
      client = new GeminiLiveClient(token, {
        onOpen: () => {
          // Status is set after connect() resolves below,
          // but this fires first to confirm WS is open.
        },
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
          clientRef.current = null;
          currentTextRef.current = "";
          setError(err.message);
          setStatus("error");
          setAiState("idle");
        },
        onClose: () => {
          if (clientRef.current !== client) return;
          stopMic();
          stopCamera();
          stopPlayback();
          cleanupAudio();
          clientRef.current = null;
          currentTextRef.current = "";
          setStatus("disconnected");
          setAiState("idle");
        },
      });

      clientRef.current = client;

      // 4. Connect and wait for WebSocket to be fully open.
      //    This Promise only resolves after onopen fires.
      const systemPrompt = buildSystemPrompt();
      await client.connect(systemPrompt);

      // 5. NOW the connection is confirmed open — safe to start media.
      //    After each await, verify this attempt is still current.
      //    disconnect() nulls clientRef, so a mismatch means we're stale.
      if (clientRef.current !== client) {
        client.disconnect();
        return;
      }
      setStatus("connected");
      setAiState("listening");
      await startMic();
      if (clientRef.current !== client) {
        stopMic();
        client.disconnect();
        return;
      }
      await startCamera();
    } catch (err) {
      console.error("Connection failed:", err);

      // Tear down anything that was partially started.
      // Use the attempt-scoped client, not clientRef.current, to avoid
      // accidentally disconnecting a newer session that took over the ref.
      stopMic();
      stopCamera();
      stopPlayback();
      client?.disconnect();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
      cleanupAudio();
      currentTextRef.current = "";

      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
      setAiState("idle");
    }
  }, [
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
  ]);

  const disconnect = useCallback(() => {
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
    return () => {
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
  };
}
