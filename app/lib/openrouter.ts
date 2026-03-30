import { OpenRouter } from "@openrouter/sdk";

export function createOpenRouter(apiKey: string): OpenRouter {
  return new OpenRouter({ apiKey });
}
