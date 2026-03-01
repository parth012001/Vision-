// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ANALYZE_MODEL } from "@/lib/constants";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  }),
}));

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function createRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns analysis text for valid image POST", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "Grinder set to 2.5",
    });

    const request = createRequest({ image: "base64jpeg" });
    const { POST } = await import("@/app/api/analyze/route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.analysis).toBe("Grinder set to 2.5");
  });

  it("returns 400 for missing image in body", async () => {
    const request = createRequest({});
    const { POST } = await import("@/app/api/analyze/route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("No image provided");
  });

  it("returns 500 when API key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const request = createRequest({ image: "base64jpeg" });
    const { POST } = await import("@/app/api/analyze/route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("GEMINI_API_KEY not configured");
  });

  it("returns 500 when generateContent throws", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API error"));

    const request = createRequest({ image: "base64jpeg", prompt: "read this" });
    const { POST } = await import("@/app/api/analyze/route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Analysis failed");
  });

  it("uses custom prompt and correct model", async () => {
    mockGenerateContent.mockResolvedValue({ text: "result" });

    const request = createRequest({
      image: "base64jpeg",
      prompt: "Custom analysis prompt",
    });
    const { POST } = await import("@/app/api/analyze/route");
    await POST(request as unknown as Parameters<typeof POST>[0]);

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe(ANALYZE_MODEL);
    const textPart = callArgs.contents[0].parts[1];
    expect(textPart.text).toBe("Custom analysis prompt");
  });
});
