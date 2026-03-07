export interface WatchdogOptions {
  nudgeDelayMs: number;
  reconnectDelayMs: number;
  onNudge: () => void;
  onReconnect: () => void;
}

export class WatchdogTimer {
  private nudgeDelayMs: number;
  private reconnectDelayMs: number;
  private onNudge: () => void;
  private onReconnect: () => void;
  private nudgeTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(options: WatchdogOptions) {
    this.nudgeDelayMs = options.nudgeDelayMs;
    this.reconnectDelayMs = options.reconnectDelayMs;
    this.onNudge = options.onNudge;
    this.onReconnect = options.onReconnect;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleTimers();
  }

  kick(): void {
    if (!this.running) return;
    this.clearTimers();
    this.scheduleTimers();
  }

  stop(): void {
    this.running = false;
    this.clearTimers();
  }

  get isRunning(): boolean {
    return this.running;
  }

  private scheduleTimers(): void {
    this.nudgeTimer = setTimeout(() => {
      if (this.running) this.onNudge();
    }, this.nudgeDelayMs);

    this.reconnectTimer = setTimeout(() => {
      if (this.running) this.onReconnect();
    }, this.reconnectDelayMs);
  }

  private clearTimers(): void {
    if (this.nudgeTimer !== null) {
      clearTimeout(this.nudgeTimer);
      this.nudgeTimer = null;
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
