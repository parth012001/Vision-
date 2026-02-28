"use client";

type ControlTrayProps = {
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onSnap: () => void;
  onEnd: () => void;
  isAnalyzing: boolean;
};

export function ControlTray({
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
  onSnap,
  onEnd,
  isAnalyzing,
}: ControlTrayProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 pb-safe z-20">
      <div className="flex items-center justify-center gap-4 p-4 bg-black/70 backdrop-blur-lg">
        {/* Mic Toggle */}
        <button
          onClick={onToggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMicOn
              ? "bg-surface-elevated text-white"
              : "bg-danger/80 text-white"
          }`}
          aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
        >
          {isMicOn ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2" x2="22" y1="2" y2="22" />
              <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
              <path d="M5 10v2a7 7 0 0 0 12 5.29" />
              <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={onToggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isCameraOn
              ? "bg-surface-elevated text-white"
              : "bg-danger/80 text-white"
          }`}
          aria-label={isCameraOn ? "Disable camera" : "Enable camera"}
        >
          {isCameraOn ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2" x2="22" y1="2" y2="22" />
              <path d="M9.5 4h5l2.5 3h3a2 2 0 0 1 2 2v7.5" />
              <path d="M2 9a2 2 0 0 1 2-2h.5" />
              <path d="M2 18a2 2 0 0 0 2 2h16" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          )}
        </button>

        {/* Snap & Analyze */}
        <button
          onClick={onSnap}
          disabled={isAnalyzing}
          className="w-14 h-14 rounded-full bg-white flex items-center justify-center
                     active:scale-95 transition-transform disabled:opacity-50"
          aria-label="Snap and analyze"
        >
          {isAnalyzing ? (
            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          )}
        </button>

        {/* End Session */}
        <button
          onClick={onEnd}
          className="w-14 h-14 rounded-full bg-danger flex items-center justify-center
                     active:scale-95 transition-transform"
          aria-label="End session"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        </button>
      </div>
    </div>
  );
}
