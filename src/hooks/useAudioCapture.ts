"use client";

import { useRef, useCallback } from "react";
import { AUDIO_SAMPLE_RATE_INPUT } from "@/lib/constants";
import { arrayBufferToBlob } from "@/lib/audio-utils";

type AudioCaptureOptions = {
  onAudioData: (blob: Blob) => void;
};

export function useAudioCapture({ onAudioData }: AudioCaptureOptions) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: AUDIO_SAMPLE_RATE_INPUT,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    streamRef.current = stream;

    const audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule("/audio-worklet-processor.js");

    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
    workletNodeRef.current = workletNode;

    workletNode.port.onmessage = (event) => {
      if (event.data.type === "pcm") {
        const blob = arrayBufferToBlob(event.data.buffer, "audio/pcm");
        onAudioData(blob);
      }
    };

    source.connect(workletNode);
    // Don't connect to destination — we don't want to hear our own mic
  }, [onAudioData]);

  const stop = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  return { start, stop };
}
