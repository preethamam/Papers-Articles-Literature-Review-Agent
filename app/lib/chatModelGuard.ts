/** UI / settings default — unchanged. Runtime routing may upgrade this to `openrouter/auto`. */
export const DEFAULT_MODEL_ID = "openrouter/free";

/** OpenRouter Auto Router — picks an optimal model per prompt (NotDiamond). */
export const OPTIMAL_ROUTER_MODEL = "openrouter/auto";

/** OpenRouter rejects requests when `models` (fallback list) has more than 3 entries. */
export const OPENROUTER_MODELS_FALLBACK_MAX = 3;

/** Routers that should be upgraded to optimal auto-selection at request time. */
const AUTO_ROUTER_IDS = new Set([DEFAULT_MODEL_ID, OPTIMAL_ROUTER_MODEL]);

/**
 * Curated allowlist for Auto Router: strong instruct models for synthesis.
 * Excludes moderation-only models (e.g. NVIDIA Nemotron Safety Guard).
 */
export const OPTIMAL_CHAT_ALLOWLIST: string[] = [
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen-2.5-72b-instruct",
  "stepfun/step-3.5-flash",
];

/**
 * Priority fallbacks if the auto-router or primary endpoint errors.
 * OpenRouter allows at most OPENROUTER_MODELS_FALLBACK_MAX entries — do not exceed.
 */
export const OPTIMAL_CHAT_FALLBACKS: string[] = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
];

export function capOpenRouterFallbackModels(models: string[]): string[] {
  return models.slice(0, OPENROUTER_MODELS_FALLBACK_MAX);
}

/** Plugins + capped `models` fallbacks for OpenRouter chat.send params. */
export function openRouterRoutingExtras(chatModel: ChatModelRequest): {
  plugins?: ChatModelRequest["plugins"];
  models?: string[];
} {
  const extras: { plugins?: ChatModelRequest["plugins"]; models?: string[] } = {};
  if (chatModel.plugins?.length) extras.plugins = chatModel.plugins;
  if (chatModel.models?.length) {
    extras.models = capOpenRouterFallbackModels(chatModel.models);
  }
  return extras;
}

export type ChatModelRequest = {
  /** Model id sent to OpenRouter. */
  model: string;
  /** True when default/auto-free was upgraded to optimal routing. */
  usedOptimalRouter: boolean;
  /** Original id from settings / request body. */
  requestedModel: string;
  plugins?: Array<{ id: string; allowed_models: string[] }>;
  models?: string[];
};

/**
 * Build OpenRouter chat params. Keeps `openrouter/free` as the settings default but
 * routes through `openrouter/auto` with a curated allowlist for best quality.
 * Explicit user model choices (e.g. Claude) are honored as-is.
 */
export function buildChatModelRequest(requested?: string | null): ChatModelRequest {
  const requestedModel = requested?.trim() || DEFAULT_MODEL_ID;

  if (!AUTO_ROUTER_IDS.has(requestedModel)) {
    return { model: requestedModel, usedOptimalRouter: false, requestedModel };
  }

  const fallbacks = capOpenRouterFallbackModels(OPTIMAL_CHAT_FALLBACKS);
  return {
    model: OPTIMAL_ROUTER_MODEL,
    usedOptimalRouter: true,
    requestedModel,
    plugins: [{ id: "auto-router", allowed_models: OPTIMAL_CHAT_ALLOWLIST }],
    models: fallbacks.length > 0 ? fallbacks : undefined,
  };
}

/** True when the model returned a safety-classifier label instead of prose. */
export function isSafetyClassifierOutput(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 400) return false;
  const hasUserSafety = /"?User Safety"?\s*:\s*"?safe"?/i.test(t);
  const hasResponseSafety = /"?Response Safety"?\s*:/i.test(t);
  const hasCategories = /"?Safety Categories"?\s*:/i.test(t);
  if (!hasUserSafety && !hasResponseSafety && !hasCategories) return false;
  const looksLikeProse =
    /\b(these papers|method|dataset|theme|crack|roadway|contrast|synthesis|however|although)\b/i.test(t);
  return !looksLikeProse;
}

export function safetyClassifierUserMessage(routedModel: string): string {
  return (
    `The model (${routedModel}) returned a content-safety classification instead of a literature review ` +
    `(e.g. NVIDIA Nemotron Safety Guard). Retry the query — optimal routing should avoid moderation-only models. ` +
    `If it persists, pick a specific chat model in Settings.`
  );
}
