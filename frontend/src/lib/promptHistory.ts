export const PROMPT_HISTORY_MAX = 10

/** Prepend trimmed prompt, dedupe, keep newest-first, cap at PROMPT_HISTORY_MAX. */
export function pushPromptHistoryEntry(history: string[], prompt: string): string[] {
  const trimmed = prompt.trim()
  if (!trimmed) return history
  const withoutDup = history.filter((p) => p !== trimmed)
  return [trimmed, ...withoutDup].slice(0, PROMPT_HISTORY_MAX)
}
