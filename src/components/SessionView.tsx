"use client";

import { useLiveSession } from "@/hooks/useLiveSession";
import { useSnapAnalyze } from "@/hooks/useSnapAnalyze";
import { CameraView } from "./CameraView";
import { ControlTray } from "./ControlTray";
import { StatusIndicator } from "./StatusIndicator";
import { TranscriptOverlay } from "./TranscriptOverlay";
import { SnapAnalyzeSheet } from "./SnapAnalyzeSheet";

export function SessionView() {
  const {
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
  } = useLiveSession();

  const {
    snap,
    result: snapResult,
    isAnalyzing: isSnapAnalyzing,
    isOpen: isSnapOpen,
    close: closeSnap,
  } = useSnapAnalyze(videoRef);

  // Idle / disconnected — show connect screen
  if (status === "idle" || status === "disconnected") {
    return (
      <div className="h-screen-safe flex flex-col items-center justify-center bg-bg px-6 pt-safe pb-safe">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          {status === "disconnected" && (
            <p className="text-text-muted text-sm">Session ended</p>
          )}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20">
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={connect}
            className="w-full py-4 px-6 rounded-2xl bg-accent text-bg font-semibold text-lg
                       active:scale-[0.97] transition-transform duration-100"
          >
            {status === "disconnected" ? "Reconnect" : "Start Session"}
          </button>
        </div>
      </div>
    );
  }

  // Connecting
  if (status === "connecting") {
    return (
      <div className="h-screen-safe flex flex-col items-center justify-center bg-bg px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Connecting to AI...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="h-screen-safe flex flex-col items-center justify-center bg-bg px-6 pt-safe pb-safe">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" x2="9" y1="9" y2="15" />
              <line x1="9" x2="15" y1="9" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">Connection Error</h2>
            <p className="text-text-muted text-sm">{error}</p>
          </div>
          <button
            onClick={connect}
            className="w-full py-4 px-6 rounded-2xl bg-accent text-bg font-semibold text-lg
                       active:scale-[0.97] transition-transform duration-100"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Connected — main session view
  return (
    <div className="h-screen-safe relative overflow-hidden bg-black">
      <CameraView ref={videoRef} isActive={isCameraOn} />
      <StatusIndicator status={status} aiState={aiState} />
      <TranscriptOverlay entries={transcript} />
      <ControlTray
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onSnap={snap}
        onEnd={disconnect}
        isAnalyzing={isSnapAnalyzing}
      />
      <SnapAnalyzeSheet
        isOpen={isSnapOpen}
        isAnalyzing={isSnapAnalyzing}
        result={snapResult}
        onClose={closeSnap}
      />
    </div>
  );
}
