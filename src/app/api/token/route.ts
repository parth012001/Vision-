import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  // For the Gemini Live API with @google/genai SDK, we pass the API key
  // to the client-side SDK which connects directly via WebSocket.
  // The SDK handles authentication internally.
  // We return the key via a server route so it never appears in client bundles.
  return NextResponse.json({ apiKey });
}
