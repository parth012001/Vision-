import { AUDIO_SAMPLE_RATE_OUTPUT } from "./constants";
import { base64ToPcm, int16ToFloat32 } from "./audio-utils";

const LOOKAHEAD_SECONDS = 0.2;
const SCHEDULE_INTERVAL_MS = 100;

/**
 * AudioStreamer manages a queue of PCM audio chunks and plays them
 * with gapless scheduling using the Web Audio API.
 *
 * Instead of waiting for each buffer to finish (onended), we schedule
 * buffers into a lookahead window ahead of the current playback position.
 * This eliminates gaps between chunks because the audio hardware always
 * has the next buffer ready before it needs it.
 */
export class AudioStreamer {
  private audioContext: AudioContext;
  private queue: Float32Array[] = [];
  private isPlaying = false;
  private nextStartTime = 0;
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private onStateChange?: (playing: boolean) => void;
  private gainNode: GainNode;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  constructor(
    audioContext: AudioContext,
    onStateChange?: (playing: boolean) => void
  ) {
    this.audioContext = audioContext;
    this.onStateChange = onStateChange;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  addChunk(base64Pcm: string) {
    const pcmBuffer = base64ToPcm(base64Pcm);
    const float32 = int16ToFloat32(pcmBuffer);
    this.queue.push(float32);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.nextStartTime = this.audioContext.currentTime;
      this.onStateChange?.(true);
      this.startScheduler();
    }
  }

  /**
   * Start a polling loop that schedules queued buffers into the
   * lookahead window. Runs every SCHEDULE_INTERVAL_MS until the
   * queue drains and all scheduled audio has finished.
   */
  private startScheduler() {
    if (this.schedulerInterval) return;

    this.scheduleBuffers();

    this.schedulerInterval = setInterval(() => {
      this.scheduleBuffers();

      // If queue is empty and all audio has played past, we're done
      if (
        this.queue.length === 0 &&
        this.audioContext.currentTime >= this.nextStartTime
      ) {
        this.stopScheduler();
        this.isPlaying = false;
        this.onStateChange?.(false);
      }
    }, SCHEDULE_INTERVAL_MS);
  }

  /**
   * Pull buffers from the queue and schedule them into Web Audio
   * as long as the next start time falls within the lookahead window.
   */
  private scheduleBuffers() {
    const deadline = this.audioContext.currentTime + LOOKAHEAD_SECONDS;

    while (this.queue.length > 0 && this.nextStartTime < deadline) {
      const samples = this.queue.shift()!;

      const audioBuffer = this.audioContext.createBuffer(
        1,
        samples.length,
        AUDIO_SAMPLE_RATE_OUTPUT
      );
      audioBuffer.getChannelData(0).set(samples);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const startTime = Math.max(
        this.nextStartTime,
        this.audioContext.currentTime
      );
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
      };
    }
  }

  private stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  stop() {
    this.stopScheduler();
    this.queue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;

    // Disconnect all in-flight sources immediately
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();

    this.onStateChange?.(false);
  }

  async resume() {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }
}
