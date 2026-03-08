import type { SessionEvent, EventName } from "@/types/events";
import { getLangfuse } from "./langfuse";

const OBSERVATION_MAP: Partial<
  Record<EventName, { name: string; level: "DEFAULT" | "WARNING" | "ERROR" }>
> = {
  "session.started": { name: "session-started", level: "DEFAULT" },
  "session.connected": { name: "connection-setup", level: "DEFAULT" },
  "session.disconnected": { name: "session-disconnected", level: "DEFAULT" },
  "session.reconnecting": { name: "reconnect-attempt", level: "WARNING" },
  "session.reconnected": { name: "reconnect-success", level: "DEFAULT" },
  "session.error": { name: "session-error", level: "ERROR" },
};

export async function ingestEventsToLangfuse(
  events: SessionEvent[]
): Promise<void> {
  const langfuse = getLangfuse();
  if (!langfuse) return;

  const byTrace = new Map<string, SessionEvent[]>();
  for (const event of events) {
    const group = byTrace.get(event.traceId) ?? [];
    group.push(event);
    byTrace.set(event.traceId, group);
  }

  for (const [traceId, traceEvents] of byTrace) {
    const sessionId = traceEvents[0].sessionId;
    const trace = langfuse.trace({
      id: traceId,
      sessionId,
      name: "session-lifecycle",
    });

    for (const event of traceEvents) {
      const mapping = OBSERVATION_MAP[event.event];
      if (!mapping) continue;

      trace.event({
        name: mapping.name,
        startTime: new Date(event.timestamp),
        input: event.data,
        level: mapping.level,
      });
    }
  }

  await langfuse.flushAsync();
}
