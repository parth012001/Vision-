// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      authTokens: {
        create: mockCreate,
      },
    };
  }),
  Modality: { AUDIO: "AUDIO" },
}));

describe("POST /api/token", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function callRoute() {
    const { POST } = await import("@/app/api/token/route");
    const response = await POST();
    return response;
  }

  it("returns token on success", async () => {
    mockCreate.mockResolvedValue({ name: "ephemeral-token-123" });

    const response = await callRoute();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.token).toBe("ephemeral-token-123");
  });

  it("returns 500 when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await callRoute();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("GEMINI_API_KEY not configured");
  });

  it("returns 500 when authTokens.create() throws", async () => {
    mockCreate.mockRejectedValue(new Error("API error"));

    const response = await callRoute();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Failed to generate session token");
  });

  it("returns 500 when token has no name", async () => {
    mockCreate.mockResolvedValue({ name: "" });

    const response = await callRoute();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Failed to generate session token");
  });
});
