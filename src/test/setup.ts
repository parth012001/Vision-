import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { createMockMediaStream } from "@/test/fixtures";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// --- navigator.mediaDevices.getUserMedia ---
Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockImplementation(() => Promise.resolve(createMockMediaStream())),
  },
  writable: true,
  configurable: true,
});

// --- AudioContext ---
class MockGainNode {
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
  gain = { value: 1 };
}

class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 24000;
  destination = {} as AudioDestinationNode;

  audioWorklet = {
    addModule: vi.fn().mockResolvedValue(undefined),
  };

  createGain = vi.fn(() => new MockGainNode());
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createBuffer = vi.fn((channels: number, length: number, sampleRate: number) => {
    const channelData = new Float32Array(length);
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: vi.fn(() => channelData),
    };
  });

  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;

// --- AudioWorkletNode ---
globalThis.AudioWorkletNode = vi.fn().mockImplementation(function () {
  return {
    port: {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: vi.fn(),
    },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
  };
}) as unknown as typeof AudioWorkletNode;
