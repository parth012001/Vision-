"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const handleStart = () => {
    setStarting(true);
    router.push("/session");
  };

  return (
    <main className="h-screen-safe flex flex-col items-center justify-center bg-bg px-6 pt-safe pb-safe">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center">
        {/* Logo / Icon */}
        <div className="w-20 h-20 rounded-2xl bg-surface-elevated flex items-center justify-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
            <line x1="6" x2="6" y1="2" y2="4" />
            <line x1="10" x2="10" y1="2" y2="4" />
            <line x1="14" x2="14" y1="2" y2="4" />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Vision</h1>
          <p className="text-text-muted text-base leading-relaxed">
            Your AI barista coach. Point your camera at your grinder and get
            real-time voice guidance.
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full py-4 px-6 rounded-2xl bg-accent text-bg font-semibold text-lg
                     active:scale-[0.97] transition-transform duration-100
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? "Starting..." : "Start Session"}
        </button>

        <p className="text-text-muted text-xs">
          Requires camera and microphone access
        </p>
      </div>
    </main>
  );
}
