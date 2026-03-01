"use client";

import type { AIState, SessionStatus } from "@/types/session";

type StatusIndicatorProps = {
  status: SessionStatus;
  aiState: AIState;
};

export function StatusIndicator({ status, aiState }: StatusIndicatorProps) {
  if (status !== "connected" && status !== "reconnecting") return null;

  const config = {
    listening: { label: "Listening", color: "bg-accent", pulse: true },
    speaking: { label: "AI Speaking", color: "bg-blue-500", pulse: true },
    thinking: { label: "Thinking", color: "bg-yellow-500", pulse: true },
    idle: { label: "Connected", color: "bg-text-muted", pulse: false },
  }[aiState];

  return (
    <div className="absolute top-0 left-0 right-0 pt-safe flex justify-center z-20">
      <div className="mt-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          {config.pulse && (
            <div
              className={`absolute w-2 h-2 rounded-full ${config.color} animate-pulse-ring`}
            />
          )}
        </div>
        <span className="text-xs font-medium text-white">{config.label}</span>
      </div>
    </div>
  );
}
