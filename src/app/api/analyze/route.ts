import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { ANALYZE_MODEL } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { image, prompt } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: ANALYZE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: image,
              },
            },
            {
              text:
                prompt ||
                "Look at this image of a coffee grinder dial/display. Read any numbers, settings, or text you can see. Be precise about the exact values shown.",
            },
          ],
        },
      ],
    });

    const text = response.text ?? "";

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
