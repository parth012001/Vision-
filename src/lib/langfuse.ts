import { Langfuse } from "langfuse";

let instance: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    console.warn(
      "[langfuse] Missing env vars — publicKey:",
      !!process.env.LANGFUSE_PUBLIC_KEY,
      "secretKey:",
      !!process.env.LANGFUSE_SECRET_KEY
    );
    return null;
  }
  if (!instance) {
    instance = new Langfuse();
    console.log("[langfuse] Client initialized, baseUrl:", process.env.LANGFUSE_BASE_URL ?? "default");
  }
  return instance;
}
