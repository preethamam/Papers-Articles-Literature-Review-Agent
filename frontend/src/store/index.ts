import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  addMessage: (msg: ChatMessage) => void
  updateLastAssistant: (token: string) => void
  setLastSources: (sources: ChatMessage['sources']) => void
  clearChat: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      chatHistory: [],
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
      clearChat: () => set({ chatHistory: [] }),
    }),
    { name: 'lit-review-v2-chat' },
  ),
)
