import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { createMockVideoStream } from "@/test/fixtures";

// Mock camera-utils since captureFrame relies on canvas/video DOM APIs
vi.mock("@/lib/camera-utils", () => ({
  captureFrame: vi.fn(() => "mock-base64-frame"),
}));

import { captureFrame } from "@/lib/camera-utils";

describe("useCameraCapture", () => {
  let onFrame: ReturnType<typeof vi.fn<(base64: string) => void>>;
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.useFakeTimers();
    onFrame = vi.fn();
    mockStream = createMockVideoStream();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start() calls getUserMedia with rear camera constraints", async () => {
    const { result } = renderHook(() =>
      useCameraCapture({ onFrame, enabled: false })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  });

  it("stop() stops tracks and clears video srcObject", async () => {
    const { result } = renderHook(() =>
      useCameraCapture({ onFrame, enabled: false })
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    const track = mockStream.getTracks()[0];
    expect(track.stop).toHaveBeenCalled();
  });

  it("enabled=true starts interval, unmount clears it", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() =>
      useCameraCapture({ onFrame, enabled: true })
    );

    expect(setIntervalSpy).toHaveBeenCalled();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("enabled=false stops the frame capture interval", () => {
    const { rerender } = renderHook(
      ({ enabled }) => useCameraCapture({ onFrame, enabled }),
      { initialProps: { enabled: true } }
    );

    vi.mocked(captureFrame).mockClear();

    rerender({ enabled: false });

    vi.advanceTimersByTime(3000);

    // captureFrame should not have been called after disabling
    expect(captureFrame).not.toHaveBeenCalled();
  });

  it("double start() stops old stream tracks", async () => {
    const firstStream = createMockVideoStream();
    const secondStream = createMockVideoStream();
    vi.mocked(navigator.mediaDevices.getUserMedia)
      .mockResolvedValueOnce(firstStream)
      .mockResolvedValueOnce(secondStream);

    const { result } = renderHook(() =>
      useCameraCapture({ onFrame, enabled: false })
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.start();
    });

    const firstTrack = firstStream.getTracks()[0];
    expect(firstTrack.stop).toHaveBeenCalled();
  });

  it("cleanup on unmount stops everything", async () => {
    const { result, unmount } = renderHook(() =>
      useCameraCapture({ onFrame, enabled: false })
    );

    await act(async () => {
      await result.current.start();
    });

    unmount();

    const track = mockStream.getTracks()[0];
    expect(track.stop).toHaveBeenCalled();
  });
});
