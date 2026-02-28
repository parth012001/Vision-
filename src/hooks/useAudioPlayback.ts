"use client";

import { useRef, useCallback } from "react";
import { AUDIO_SAMPLE_RATE_OUTPUT } from "@/lib/constants";
import { AudioStreamer } from "@/lib/audio-streamer";

type AudioPlaybackOptions = {
  onPlayingChange?: (playing: boolean) => void;
};

export function useAudioPlayback({ onPlayingChange }: AudioPlaybackOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);

  const init = useCallback(() => {
    if (audioContextRef.current) return;

    const audioContext = new AudioContext({
      sampleRate: AUDIO_SAMPLE_RATE_OUTPUT,
    });
    audioContextRef.current = audioContext;

    streamerRef.current = new AudioStreamer(audioContext, onPlayingChange);
  }, [onPlayingChange]);

  const playChunk = useCallback(
    (base64Pcm: string) => {
      if (!streamerRef.current) init();
      streamerRef.current?.addChunk(base64Pcm);
    },
    [init]
  );

  const stop = useCallback(() => {
    streamerRef.current?.stop();
  }, []);

  const resume = useCallback(async () => {
    if (!streamerRef.current) init();
    await streamerRef.current?.resume();
  }, [init]);

  const cleanup = useCallback(() => {
    streamerRef.current?.stop();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamerRef.current = null;
  }, []);

  return { playChunk, stop, resume, cleanup, init };
}
