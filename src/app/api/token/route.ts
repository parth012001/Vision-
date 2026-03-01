import { GoogleGenAI, Modality } from "@google/genai";
import { NextResponse } from "next/server";
import { EPHEMERAL_TOKEN_EXPIRE_MS, LIVE_MODEL } from "@/lib/constants";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const expireTime = new Date(
      Date.now() + EPHEMERAL_TOKEN_EXPIRE_MS
    ).toISOString();

    const authToken = await ai.authTokens.create({
      config: {
        expireTime,
        uses: 1,
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    });

    if (!authToken.name) {
      throw new Error("Failed to generate ephemeral token");
    }

    return NextResponse.json({ token: authToken.name });
  } catch (err) {
    console.error("Token generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate session token" },
      { status: 500 }
    );
  }
}
