"use client";

import { useState, useCallback, useRef } from "react";
import { captureHighResFrame, captureFrameDataUrl } from "@/lib/camera-utils";
import type { SnapResult } from "@/types/session";

export function useSnapAnalyze(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SnapResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const snap = useCallback(async () => {
    if (!videoRef.current) return;

    setIsAnalyzing(true);
    setIsOpen(true);

    try {
      const base64 = captureHighResFrame(videoRef.current);
      const dataUrl = captureFrameDataUrl(videoRef.current);

      if (!base64 || !dataUrl) {
        throw new Error("Failed to capture frame");
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setResult({
        imageDataUrl: dataUrl,
        analysis: data.analysis,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Snap analyze failed:", err);
      setResult({
        imageDataUrl: "",
        analysis: `Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoRef]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { snap, result, isAnalyzing, isOpen, close };
}
