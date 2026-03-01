import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioCapture } from "../useAudioCapture";
import { createMockMediaStream } from "@/test/fixtures";

describe("useAudioCapture", () => {
  let onAudioData: ReturnType<typeof vi.fn<(base64: string) => void>>;
  let mockStream: MediaStream;

  beforeEach(() => {
    onAudioData = vi.fn();
    mockStream = createMockMediaStream();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream);
  });

  it("start() calls getUserMedia with correct audio constraints", async () => {
    const { result } = renderHook(() =>
      useAudioCapture({ onAudioData })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  });

  it("start() creates AudioContext and loads worklet", async () => {
    const { result } = renderHook(() =>
      useAudioCapture({ onAudioData })
    );

    await act(async () => {
      await result.current.start();
    });

    // AudioWorkletNode should have been constructed (proves AudioContext was created + worklet loaded)
    const WorkletCtor = AudioWorkletNode as unknown as ReturnType<typeof vi.fn>;
    expect(WorkletCtor).toHaveBeenCalled();
  });

  it("stop() stops all tracks and cleans up resources", async () => {
    const { result } = renderHook(() =>
      useAudioCapture({ onAudioData })
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

  it("double start() tears down previous resources first", async () => {
    const firstStream = createMockMediaStream();
    const secondStream = createMockMediaStream();
    vi.mocked(navigator.mediaDevices.getUserMedia)
      .mockResolvedValueOnce(firstStream)
      .mockResolvedValueOnce(secondStream);

    const { result } = renderHook(() =>
      useAudioCapture({ onAudioData })
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.start();
    });

    // First stream's tracks should have been stopped
    const firstTrack = firstStream.getTracks()[0];
    expect(firstTrack.stop).toHaveBeenCalled();
  });

  it("worklet onmessage triggers onAudioData with base64", async () => {
    const { result } = renderHook(() =>
      useAudioCapture({ onAudioData })
    );

    await act(async () => {
      await result.current.start();
    });

    // The mock returns a plain object from the factory fn — grab it from mock.results
    const WorkletCtor = AudioWorkletNode as unknown as ReturnType<typeof vi.fn>;
    const workletInstance = WorkletCtor.mock.results[0].value;
    const pcmBuffer = new Int16Array([100, 200]).buffer;

    act(() => {
      workletInstance.port.onmessage?.({
        data: { type: "pcm", buffer: pcmBuffer },
      } as MessageEvent);
    });

    expect(onAudioData).toHaveBeenCalledOnce();
    expect(typeof onAudioData.mock.calls[0][0]).toBe("string"); // base64
  });

  it("ignores non-pcm worklet messages", async () => {
    const { result } = renderHook(() =>
      useAudioCapture({ onAudioData })
    );

    await act(async () => {
      await result.current.start();
    });

    const WorkletCtor = AudioWorkletNode as unknown as ReturnType<typeof vi.fn>;
    const workletInstance = WorkletCtor.mock.results[0].value;

    act(() => {
      workletInstance.port.onmessage?.({
        data: { type: "other", buffer: new ArrayBuffer(0) },
      } as MessageEvent);
    });

    expect(onAudioData).not.toHaveBeenCalled();
  });
});
