import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventCollector } from "@/lib/event-collector";

const STARTED_DATA = { userAgent: "test-ua", deviceType: "desktop" as const };
const CONNECTED_DATA = { connectionDurationMs: 100, isReconnect: false };

describe("EventCollector", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let sendBeaconMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon: sendBeaconMock,
      userAgent: navigator.userAgent,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("buffers events and does not flush below threshold", () => {
    const collector = new EventCollector({
      sessionId: "s1",
      flushThreshold: 10,
    });

    for (let i = 0; i < 9; i++) {
      collector.track("session.started", STARTED_DATA);
    }

    expect(fetchMock).not.toHaveBeenCalled();
    collector.destroy();
  });

  it("flushes at threshold", () => {
    const collector = new EventCollector({
      sessionId: "s1",
      flushThreshold: 10,
    });

    for (let i = 0; i < 10; i++) {
      collector.track("session.started", STARTED_DATA);
    }

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events).toHaveLength(10);
    collector.destroy();
  });

  it("flushes on 30s timer", () => {
    const collector = new EventCollector({
      sessionId: "s1",
      flushIntervalMs: 30_000,
    });

    collector.track("session.started", STARTED_DATA);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30_000);
    expect(fetchMock).toHaveBeenCalledOnce();
    collector.destroy();
  });

  it("attaches sessionId to all events", () => {
    const collector = new EventCollector({
      sessionId: "test-session-123",
      flushThreshold: 1,
    });

    collector.track("session.started", STARTED_DATA);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events[0].sessionId).toBe("test-session-123");
    collector.destroy();
  });

  it("updates traceId via setTraceId()", () => {
    const collector = new EventCollector({
      sessionId: "s1",
      flushThreshold: 1,
    });

    collector.setTraceId("trace-abc");
    collector.track("session.started", STARTED_DATA);

    const body1 = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body1.events[0].traceId).toBe("trace-abc");

    collector.setTraceId("trace-xyz");
    collector.track("session.connected", CONNECTED_DATA);

    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body2.events[0].traceId).toBe("trace-xyz");
    collector.destroy();
  });

  it("retries once on fetch failure and drops on second", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network again"));

    const collector = new EventCollector({
      sessionId: "s1",
      flushThreshold: 1,
    });

    collector.track("session.started", STARTED_DATA);

    // Let the retry promise chain resolve
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    // First call + one retry = 2 total
    expect(fetchMock).toHaveBeenCalledTimes(2);
    collector.destroy();
  });

  it("destroy() flushes remaining via sendBeacon", () => {
    const collector = new EventCollector({ sessionId: "s1" });

    collector.track("session.started", STARTED_DATA);
    collector.track("session.connected", CONNECTED_DATA);
    collector.destroy();

    expect(sendBeaconMock).toHaveBeenCalledOnce();
    const blob = sendBeaconMock.mock.calls[0][1] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(sendBeaconMock.mock.calls[0][0]).toBe("/api/events");
  });

  it("destroy() falls back to fetch when sendBeacon returns false", () => {
    sendBeaconMock.mockReturnValue(false);
    const collector = new EventCollector({ sessionId: "s1" });

    collector.track("session.started", STARTED_DATA);
    collector.destroy();

    expect(sendBeaconMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("destroy() clears timers", () => {
    const collector = new EventCollector({
      sessionId: "s1",
      flushIntervalMs: 30_000,
    });

    collector.track("session.started", STARTED_DATA);
    collector.destroy();

    // Clear the sendBeacon call tracking
    sendBeaconMock.mockClear();
    fetchMock.mockClear();

    // Timer should not fire after destroy
    vi.advanceTimersByTime(30_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it("track() is no-op after destroy()", () => {
    const collector = new EventCollector({
      sessionId: "s1",
      flushThreshold: 1,
    });

    collector.destroy();
    sendBeaconMock.mockClear();
    fetchMock.mockClear();

    collector.track("session.started", STARTED_DATA);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it("flush() is no-op on empty buffer", () => {
    const collector = new EventCollector({ sessionId: "s1" });

    collector.flush();
    expect(fetchMock).not.toHaveBeenCalled();
    collector.destroy();
  });
});
