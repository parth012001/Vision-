"use client";

import { useEffect, useRef } from "react";
import type { TranscriptEntry } from "@/types/session";

type TranscriptOverlayProps = {
  entries: TranscriptEntry[];
};

export function TranscriptOverlay({ entries }: TranscriptOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Only show the last 3 entries
  const recentEntries = entries.slice(-3);

  if (recentEntries.length === 0) return null;

  return (
    <div className="absolute bottom-32 left-0 right-0 z-10 px-4 pointer-events-none">
      <div
        ref={scrollRef}
        className="max-h-40 overflow-y-auto space-y-2"
      >
        {recentEntries.map((entry) => (
          <div
            key={entry.id}
            className={`px-3 py-2 rounded-xl text-sm leading-relaxed animate-fade-in ${
              entry.role === "model"
                ? "bg-black/60 backdrop-blur-md text-white"
                : "bg-white/20 backdrop-blur-md text-white/80 ml-12"
            }`}
          >
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
