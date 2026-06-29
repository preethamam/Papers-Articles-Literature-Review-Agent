import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pushPromptHistoryEntry } from '@/lib/promptHistory'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    title: string
    year?: number
    category: string
    paper_id: string
    chunk: string
    relevance?: number
  }>
}

interface AppState {
  chatHistory: ChatMessage[]
  promptHistory: string[]
  addMessage: (msg: ChatMessage) => void
  updateLastAssistant: (token: string) => void
  setLastSources: (sources: ChatMessage['sources']) => void
  pushPromptHistory: (prompt: string) => void
  clearChat: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      chatHistory: [],
      promptHistory: [],
      addMessage: (msg) =>
        set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
      updateLastAssistant: (token) =>
        set((s) => {
          const history = [...s.chatHistory]
          const last = history[history.length - 1]
          if (last?.role === 'assistant') {
            history[history.length - 1] = { ...last, content: last.content + token }
          }
          return { chatHistory: history }
        }),
      setLastSources: (sources) =>
        set((s) => {
          const history = [...s.chatHistory]
          const last = history[history.length - 1]
          if (last?.role === 'assistant') {
            history[history.length - 1] = { ...last, sources }
          }
          return { chatHistory: history }
        }),
      pushPromptHistory: (prompt) =>
        set((s) => ({ promptHistory: pushPromptHistoryEntry(s.promptHistory, prompt) })),
      clearChat: () => set({ chatHistory: [] }),
    }),
    { name: 'lit-review-v2-chat' },
  ),
)
