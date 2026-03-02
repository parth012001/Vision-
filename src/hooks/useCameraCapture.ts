"use client";

import { useRef, useCallback, useEffect } from "react";
import { CAMERA_FPS } from "@/lib/constants";
import { captureFrame } from "@/lib/camera-utils";

type CameraCaptureOptions = {
  onFrame: (base64: string) => void;
  enabled: boolean;
};

export function useCameraCapture({ onFrame, enabled }: CameraCaptureOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startFrameCapture = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      if (!videoRef.current) return;
      const base64 = captureFrame(videoRef.current);
      if (base64) {
        onFrame(base64);
      }
    }, 1000 / CAMERA_FPS);
  }, [onFrame]);

  const stopFrameCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopFrameCapture();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopFrameCapture]);

  const start = useCallback(async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    // Restart frame capture — on reconnect the enabled useEffect won't
    // re-fire because isCameraOn never changed, so we must start it here.
    if (enabled) {
      startFrameCapture();
    }
  }, [enabled, startFrameCapture]);

  useEffect(() => {
    if (enabled) {
      startFrameCapture();
    } else {
      stopFrameCapture();
    }
  }, [enabled, startFrameCapture, stopFrameCapture]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, start, stop };
}
