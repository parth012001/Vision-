import { NextRequest, NextResponse, after } from "next/server";
import { ingestEventsToLangfuse } from "@/lib/langfuse-ingest";
import type { SessionEvent } from "@/types/events";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.events)) {
      return NextResponse.json(
        { error: "Missing or invalid 'events' array" },
        { status: 400 }
      );
    }

    const events: unknown[] = body.events;

    // Validate entire batch before logging anything
    for (const event of events) {
      if (typeof event !== "object" || event === null) {
        return NextResponse.json(
          { error: "Each event must be an object" },
          { status: 400 }
        );
      }
      const e = event as Record<string, unknown>;
      if (typeof e.event !== "string" || e.event.length === 0) {
        return NextResponse.json(
          { error: "Each event must have a non-empty 'event' string" },
          { status: 400 }
        );
      }
      if (typeof e.sessionId !== "string" || e.sessionId.length === 0) {
        return NextResponse.json(
          { error: "Each event must have a non-empty 'sessionId' string" },
          { status: 400 }
        );
      }
      if (typeof e.timestamp !== "number" || !Number.isFinite(e.timestamp)) {
        return NextResponse.json(
          { error: "Each event must have a finite numeric 'timestamp'" },
          { status: 400 }
        );
      }
    }

    // Batch validated — log all events
    for (const event of events) {
      const e = event as Record<string, unknown>;
      console.log(
        "[observability]",
        JSON.stringify({
          event: e.event,
          sessionId: e.sessionId,
          traceId: e.traceId,
          timestamp: e.timestamp,
          data: e.data,
        })
      );
    }

    after(async () => {
      try {
        await ingestEventsToLangfuse(events as SessionEvent[]);
      } catch (err) {
        console.error("[langfuse] Ingestion failed:", err);
      }
    });

    return NextResponse.json({ received: events.length });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
