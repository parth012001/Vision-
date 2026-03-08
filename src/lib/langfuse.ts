import { Langfuse } from "langfuse";

let instance: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return null;
  }
  if (!instance) {
    instance = new Langfuse();
  }
  return instance;
}
