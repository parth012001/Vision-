import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WatchdogTimer } from "../watchdog";

describe("WatchdogTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires nudge callback at nudge delay", () => {
    const onNudge = vi.fn();
    const onReconnect = vi.fn();
    const wd = new WatchdogTimer({
      nudgeDelayMs: 1000,
      reconnectDelayMs: 2000,
      onNudge,
      onReconnect,
    });

    wd.start();
    vi.advanceTimersByTime(999);
    expect(onNudge).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onNudge).toHaveBeenCalledOnce();
    expect(onReconnect).not.toHaveBeenCalled();

    wd.stop();
  });

  it("fires reconnect callback at reconnect delay", () => {
    const onNudge = vi.fn();
    const onReconnect = vi.fn();
    const wd = new WatchdogTimer({
      nudgeDelayMs: 1000,
      reconnectDelayMs: 2000,
      onNudge,
      onReconnect,
    });

    wd.start();
    vi.advanceTimersByTime(2000);
    expect(onReconnect).toHaveBeenCalledOnce();

    wd.stop();
  });

  it("kick() resets both timers", () => {
    const onNudge = vi.fn();
    const onReconnect = vi.fn();
    const wd = new WatchdogTimer({
      nudgeDelayMs: 1000,
      reconnectDelayMs: 2000,
      onNudge,
      onReconnect,
    });

    wd.start();
    vi.advanceTimersByTime(900);
    wd.kick();

    // After kick, timers restart — advance 900ms again (total 1800ms since start)
    vi.advanceTimersByTime(900);
    expect(onNudge).not.toHaveBeenCalled(); // would have fired at 1000ms without kick

    // Now advance to 1000ms after kick
    vi.advanceTimersByTime(100);
    expect(onNudge).toHaveBeenCalledOnce();

    wd.stop();
  });

  it("stop() prevents callbacks from firing", () => {
    const onNudge = vi.fn();
    const onReconnect = vi.fn();
    const wd = new WatchdogTimer({
      nudgeDelayMs: 1000,
      reconnectDelayMs: 2000,
      onNudge,
      onReconnect,
    });

    wd.start();
    wd.stop();

    vi.advanceTimersByTime(5000);
    expect(onNudge).not.toHaveBeenCalled();
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("kick() is no-op when not running", () => {
    const onNudge = vi.fn();
    const onReconnect = vi.fn();
    const wd = new WatchdogTimer({
      nudgeDelayMs: 1000,
      reconnectDelayMs: 2000,
      onNudge,
      onReconnect,
    });

    wd.kick(); // should not throw or start timers
    vi.advanceTimersByTime(5000);
    expect(onNudge).not.toHaveBeenCalled();
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("no timer leaks across start/stop cycles", () => {
    const onNudge = vi.fn();
    const onReconnect = vi.fn();
    const wd = new WatchdogTimer({
      nudgeDelayMs: 1000,
      reconnectDelayMs: 2000,
      onNudge,
      onReconnect,
    });

    // Start and stop multiple times
    wd.start();
    wd.stop();
    wd.start();
    wd.stop();
    wd.start();

    vi.advanceTimersByTime(1000);
    // Only the last start's timers should fire
    expect(onNudge).toHaveBeenCalledTimes(1);

    wd.stop();
  });

  it("reports running state correctly", () => {
    const wd = new WatchdogTimer({
      nudgeDelayMs: 1000,
      reconnectDelayMs: 2000,
      onNudge: vi.fn(),
      onReconnect: vi.fn(),
    });

    expect(wd.isRunning).toBe(false);
    wd.start();
    expect(wd.isRunning).toBe(true);
    wd.stop();
    expect(wd.isRunning).toBe(false);
  });
});
