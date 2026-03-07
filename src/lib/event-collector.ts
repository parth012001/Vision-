import type { EventName, EventDataMap, SessionEvent } from "@/types/events";

export interface EventCollectorOptions {
  sessionId: string;
  endpoint?: string;
  flushThreshold?: number;
  flushIntervalMs?: number;
}

export class EventCollector {
  private sessionId: string;
  private traceId = "";
  private endpoint: string;
  private flushThreshold: number;
  private flushIntervalMs: number;
  private buffer: SessionEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private boundPageHide: (() => void) | null = null;
  private boundVisibilityChange: (() => void) | null = null;

  constructor(options: EventCollectorOptions) {
    this.sessionId = options.sessionId;
    this.endpoint = options.endpoint ?? "/api/events";
    this.flushThreshold = options.flushThreshold ?? 10;
    this.flushIntervalMs = options.flushIntervalMs ?? 30_000;

    if (typeof window !== "undefined") {
      this.boundPageHide = () => this.flush();
      this.boundVisibilityChange = () => {
        if (document.visibilityState === "hidden") this.flush();
      };
      window.addEventListener("pagehide", this.boundPageHide);
      document.addEventListener("visibilitychange", this.boundVisibilityChange);
    }
  }

  setTraceId(id: string): void {
    this.traceId = id;
  }

  track<E extends EventName>(event: E, data: EventDataMap[E]): void {
    if (this.destroyed) return;

    this.buffer.push({
      event,
      sessionId: this.sessionId,
      traceId: this.traceId,
      timestamp: Date.now(),
      data,
    } as SessionEvent);

    if (this.buffer.length >= this.flushThreshold) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;

    const events = this.buffer;
    this.buffer = [];
    this.clearFlushTimer();

    this.sendEvents(events);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearFlushTimer();

    if (typeof window !== "undefined") {
      if (this.boundPageHide) {
        window.removeEventListener("pagehide", this.boundPageHide);
      }
      if (this.boundVisibilityChange) {
        document.removeEventListener(
          "visibilitychange",
          this.boundVisibilityChange
        );
      }
    }

    if (this.buffer.length > 0) {
      const events = this.buffer;
      this.buffer = [];

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([JSON.stringify({ events })], {
          type: "application/json",
        });
        const sent = navigator.sendBeacon(this.endpoint, blob);
        if (!sent) {
          this.sendEvents(events);
        }
      } else {
        this.sendEvents(events);
      }
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.flushIntervalMs);
  }

  private clearFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private sendEvents(events: SessionEvent[], isRetry = false): void {
    fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok && !isRetry) {
          this.sendEvents(events, true);
        }
      })
      .catch(() => {
        if (!isRetry) {
          this.sendEvents(events, true);
        }
      });
  }
}
