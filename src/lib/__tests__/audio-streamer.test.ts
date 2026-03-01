import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioStreamer } from "@/lib/audio-streamer";
import { MOCK_PCM_BASE64 } from "@/test/fixtures";

describe("AudioStreamer", () => {
  let audioContext: AudioContext;
  let onStateChange: ReturnType<typeof vi.fn<(playing: boolean) => void>>;
  let streamer: AudioStreamer;

  beforeEach(() => {
    vi.useFakeTimers();
    audioContext = new AudioContext();
    onStateChange = vi.fn();
    streamer = new AudioStreamer(audioContext, onStateChange);
  });

  afterEach(() => {
    streamer.stop();
    vi.useRealTimers();
  });

  describe("addChunk", () => {
    it("starts playback and fires onStateChange(true) on first chunk", () => {
      streamer.addChunk(MOCK_PCM_BASE64);

      expect(onStateChange).toHaveBeenCalledWith(true);
      expect(audioContext.createBufferSource).toHaveBeenCalled();
    });

    it("queues multiple chunks without re-triggering onStateChange(true)", () => {
      streamer.addChunk(MOCK_PCM_BASE64);
      streamer.addChunk(MOCK_PCM_BASE64);

      // onStateChange(true) should only be called once
      const trueCalls = onStateChange.mock.calls.filter(
        (args) => args[0] === true
      );
      expect(trueCalls).toHaveLength(1);
    });
  });

  describe("scheduling", () => {
    it("creates AudioBufferSourceNodes with correct sample rate", () => {
      streamer.addChunk(MOCK_PCM_BASE64);

      expect(audioContext.createBuffer).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        24000
      );
    });

    it("calls source.start() within 200ms lookahead window", () => {
      streamer.addChunk(MOCK_PCM_BASE64);

      const source = (audioContext.createBufferSource as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(source.start).toHaveBeenCalled();
      const scheduledTime = source.start.mock.calls[0][0] as number;
      expect(scheduledTime).toBeGreaterThanOrEqual(audioContext.currentTime);
      expect(scheduledTime).toBeLessThanOrEqual(audioContext.currentTime + 0.2);
    });
  });

  describe("stop", () => {
    it("clears queue, stops sources, and fires onStateChange(false)", () => {
      streamer.addChunk(MOCK_PCM_BASE64);
      streamer.addChunk(MOCK_PCM_BASE64);

      onStateChange.mockClear();
      streamer.stop();

      expect(onStateChange).toHaveBeenCalledWith(false);
    });

    it("calls stop() on active sources", () => {
      streamer.addChunk(MOCK_PCM_BASE64);

      const source = (audioContext.createBufferSource as ReturnType<typeof vi.fn>).mock.results[0].value;
      streamer.stop();

      expect(source.stop).toHaveBeenCalled();
    });

    it("is safe to call when not playing", () => {
      expect(() => streamer.stop()).not.toThrow();
    });
  });

  describe("scheduler drain", () => {
    it("fires onStateChange(false) when queue drains and audio finishes", () => {
      streamer.addChunk(MOCK_PCM_BASE64);

      onStateChange.mockClear();

      // Simulate time having passed beyond all scheduled audio.
      // The scheduler checks audioContext.currentTime >= nextStartTime.
      // We need currentTime to be past the buffer duration.
      Object.defineProperty(audioContext, "currentTime", {
        value: 100,
        writable: true,
        configurable: true,
      });

      // Advance the scheduler interval (100ms)
      vi.advanceTimersByTime(200);

      expect(onStateChange).toHaveBeenCalledWith(false);
    });
  });

  describe("resume", () => {
    it("calls audioContext.resume() when suspended", async () => {
      Object.defineProperty(audioContext, "state", {
        value: "suspended",
        writable: true,
      });

      await streamer.resume();
      expect(audioContext.resume).toHaveBeenCalled();
    });

    it("does not call resume() when already running", async () => {
      await streamer.resume();
      expect(audioContext.resume).not.toHaveBeenCalled();
    });
  });
});
