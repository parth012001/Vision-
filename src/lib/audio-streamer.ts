import { AUDIO_SAMPLE_RATE_OUTPUT } from "./constants";
import { base64ToPcm, int16ToFloat32 } from "./audio-utils";

/**
 * AudioStreamer manages a queue of PCM audio chunks and plays them
 * sequentially using the Web Audio API with precise scheduling.
 */
export class AudioStreamer {
  private audioContext: AudioContext;
  private queue: Float32Array[] = [];
  private isPlaying = false;
  private nextStartTime = 0;
  private onStateChange?: (playing: boolean) => void;
  private gainNode: GainNode;

  constructor(
    audioContext: AudioContext,
    onStateChange?: (playing: boolean) => void
  ) {
    this.audioContext = audioContext;
    this.onStateChange = onStateChange;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  /**
   * Add a base64-encoded PCM chunk to the playback queue.
   */
  addChunk(base64Pcm: string) {
    const pcmBuffer = base64ToPcm(base64Pcm);
    const float32 = int16ToFloat32(pcmBuffer);
    this.queue.push(float32);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.nextStartTime = this.audioContext.currentTime;
      this.onStateChange?.(true);
      this.scheduleNext();
    }
  }

  /**
   * Schedule the next chunk for playback.
   */
  private scheduleNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onStateChange?.(false);
      return;
    }

    const samples = this.queue.shift()!;
    const buffer = this.audioContext.createBuffer(
      1,
      samples.length,
      AUDIO_SAMPLE_RATE_OUTPUT
    );
    buffer.getChannelData(0).set(samples);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);

    // Schedule precisely after the previous chunk
    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;

    source.onended = () => {
      this.scheduleNext();
    };
  }

  /**
   * Clear the queue and stop playback.
   */
  stop() {
    this.queue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;
    this.onStateChange?.(false);
  }

  /**
   * Resume audio context (required after user gesture on mobile).
   */
  async resume() {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }
}
