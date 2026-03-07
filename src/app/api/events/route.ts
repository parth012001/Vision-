import { NextRequest, NextResponse } from "next/server";
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

    const events: SessionEvent[] = body.events;

    for (const event of events) {
      if (!event.event || !event.sessionId || !event.timestamp) {
        return NextResponse.json(
          { error: "Each event must have 'event', 'sessionId', and 'timestamp'" },
          { status: 400 }
        );
      }

      console.log(
        "[observability]",
        JSON.stringify({
          event: event.event,
          sessionId: event.sessionId,
          traceId: event.traceId,
          timestamp: event.timestamp,
          data: event.data,
        })
      );
    }

    return NextResponse.json({ received: events.length });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
