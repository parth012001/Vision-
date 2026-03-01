import { vi } from "vitest";

/**
 * Create a mock MediaStream with stoppable tracks.
 */
export function createMockMediaStream(): MediaStream {
  const track = {
    kind: "audio" as const,
    stop: vi.fn(),
    enabled: true,
    readyState: "live" as const,
    id: "mock-track-" + Math.random().toString(36).slice(2),
  };

  return {
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track]),
    getVideoTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    active: true,
    id: "mock-stream-" + Math.random().toString(36).slice(2),
  } as unknown as MediaStream;
}

/**
 * Create a mock video MediaStream.
 */
export function createMockVideoStream(): MediaStream {
  const track = {
    kind: "video" as const,
    stop: vi.fn(),
    enabled: true,
    readyState: "live" as const,
    id: "mock-video-track-" + Math.random().toString(36).slice(2),
  };

  return {
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => []),
    getVideoTracks: vi.fn(() => [track]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    active: true,
    id: "mock-video-stream-" + Math.random().toString(36).slice(2),
  } as unknown as MediaStream;
}

/**
 * Minimal valid base64-encoded Int16 PCM buffer (4 samples = 8 bytes).
 * Values: [0, 16384, 32767, -32768]
 */
export const MOCK_PCM_BASE64 = btoa(
  String.fromCharCode(
    // Int16LE: 0
    0x00, 0x00,
    // Int16LE: 16384
    0x00, 0x40,
    // Int16LE: 32767
    0xff, 0x7f,
    // Int16LE: -32768
    0x00, 0x80
  )
);

/** Minimal fake JPEG base64 string. */
export const MOCK_JPEG_BASE64 = btoa("fake-jpeg-data");

/** Fake ephemeral token. */
export const MOCK_TOKEN = "test-ephemeral-token-abc123";
